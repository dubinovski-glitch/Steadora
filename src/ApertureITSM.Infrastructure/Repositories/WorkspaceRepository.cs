using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;
using System.Text.RegularExpressions;

namespace ApertureITSM.Infrastructure.Repositories;

/// <summary>
/// Manages workspaces — the multi-tenancy boundary that isolates one tenant's data from another.
/// Handles workspace CRUD plus their per-workspace configuration: visible/mandatory field overrides
/// and user membership. Each returned workspace is "enriched" with its fields and member ids.
/// </summary>
public class WorkspaceRepository(IDbConnectionFactory db) : IWorkspaceRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(WorkspaceRepository));

    /// <summary>Returns every workspace (default first, then by name), each enriched with fields and members.</summary>
    public async Task<IEnumerable<Workspace>> GetAllAsync()
    {
        const string sql = "SELECT * FROM core.Workspace ORDER BY IsDefault DESC, Name";
        try
        {
            using var conn = db.Create();
            var workspaces = (await conn.QueryAsync<Workspace>(sql)).ToList();
            await EnrichAsync(conn, workspaces);
            return workspaces;
        }
        catch (Exception ex) { log.Error("Failed to get workspaces", ex); throw; }
    }

    /// <summary>Returns a single workspace by id (enriched with its fields and members), or null if missing.</summary>
    public async Task<Workspace?> GetByIdAsync(int workspaceId)
    {
        const string sql = "SELECT * FROM core.Workspace WHERE WorkspaceId=@workspaceId";
        try
        {
            using var conn = db.Create();
            var ws = await conn.QueryFirstOrDefaultAsync<Workspace>(sql, new { workspaceId });
            if (ws is null) return null;
            await EnrichAsync(conn, [ws]);
            return ws;
        }
        catch (Exception ex) { log.Error($"Failed to get workspace {workspaceId}", ex); throw; }
    }

    /// <summary>
    /// Returns the active workspaces a user may switch between; if they have no explicit assignments,
    /// falls back to the single default workspace so every user always has at least one.
    /// </summary>
    public async Task<IEnumerable<Workspace>> GetForUserAsync(int userId)
    {
        try
        {
            using var conn = db.Create();
            var sql = """
                SELECT w.* FROM core.Workspace w
                JOIN core.WorkspaceUser wu ON wu.WorkspaceId = w.WorkspaceId
                WHERE wu.UserId = @userId AND w.IsActive = 1
                ORDER BY w.Name
                """;
            var workspaces = (await conn.QueryAsync<Workspace>(sql, new { userId })).ToList();

            // Fall back to default workspace when user has no explicit assignments
            if (workspaces.Count == 0)
            {
                sql = "SELECT TOP 1 * FROM core.Workspace WHERE IsDefault=1 AND IsActive=1";
                var def = await conn.QueryFirstOrDefaultAsync<Workspace>(sql);
                if (def is not null) workspaces.Add(def);
            }

            await EnrichAsync(conn, workspaces);
            return workspaces;
        }
        catch (Exception ex) { log.Error($"Failed to get workspaces for user {userId}", ex); throw; }
    }

    /// <summary>
    /// Creates a new (non-default) workspace with a unique slug, then seeds its field configuration by
    /// copying the default workspace's field set so it starts with sensible defaults. Returns the new id.
    /// </summary>
    public async Task<int> CreateAsync(CreateWorkspaceRequest request)
    {
        try
        {
            using var conn = db.Create();
            var slug = MakeSlug(request.Name);

            // Ensure slug uniqueness
            var existing = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM core.Workspace WHERE Slug=@slug", new { slug });
            if (existing > 0)
                slug = $"{slug}-{Guid.NewGuid().ToString("N")[..6]}";

            var id = await conn.ExecuteScalarAsync<int>("""
                INSERT INTO core.Workspace (Name, Slug, Description, IsDefault, IsActive)
                OUTPUT INSERTED.WorkspaceId
                VALUES (@name, @slug, @desc, 0, 1)
                """, new { name = request.Name, slug, desc = request.Description });

            // Seed field configs by copying from the default workspace
            var defFields = (await conn.QueryAsync<WorkspaceField>("""
                SELECT wf.EntityType, wf.FieldKey, wf.IsVisible, wf.IsMandatory
                FROM core.WorkspaceField wf
                JOIN core.Workspace w ON w.WorkspaceId = wf.WorkspaceId
                WHERE w.IsDefault = 1
                """)).ToList();

            if (defFields.Count > 0)
            {
                await conn.ExecuteAsync("""
                    INSERT INTO core.WorkspaceField (WorkspaceId, EntityType, FieldKey, IsVisible, IsMandatory)
                    VALUES (@id, @EntityType, @FieldKey, @IsVisible, @IsMandatory)
                    """, defFields.Select(f => new { id, f.EntityType, f.FieldKey, f.IsVisible, f.IsMandatory }));
            }

            log.Info($"Created workspace {id}: {request.Name}");
            return id;
        }
        catch (Exception ex) { log.Error($"Failed to create workspace: {request.Name}", ex); throw; }
    }

    /// <summary>
    /// Updates a workspace's name/description (and active flag for non-default workspaces). The two
    /// statements are mutually exclusive by IsDefault: the default workspace can be renamed but never
    /// deactivated.
    /// </summary>
    public async Task UpdateAsync(int workspaceId, UpdateWorkspaceRequest request)
    {
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync("""
                UPDATE core.Workspace
                SET Name=@name, Description=@desc, IsActive=@active, UpdatedAt=SYSUTCDATETIME()
                WHERE WorkspaceId=@workspaceId AND IsDefault=0
                """, new { workspaceId, name = request.Name, desc = request.Description, active = request.IsActive });

            // Default workspace allows name/description update but not deactivation
            await conn.ExecuteAsync("""
                UPDATE core.Workspace
                SET Name=@name, Description=@desc, UpdatedAt=SYSUTCDATETIME()
                WHERE WorkspaceId=@workspaceId AND IsDefault=1
                """, new { workspaceId, name = request.Name, desc = request.Description });

            log.Info($"Updated workspace {workspaceId}");
        }
        catch (Exception ex) { log.Error($"Failed to update workspace {workspaceId}", ex); throw; }
    }

    /// <summary>
    /// Upserts per-workspace field visibility/mandatory overrides. Each field is MERGEd so existing
    /// rows are updated and new ones inserted in a single statement.
    /// </summary>
    public async Task SetFieldsAsync(int workspaceId, IEnumerable<SetWorkspaceFieldRequest> fields)
    {
        try
        {
            using var conn = db.Create();
            foreach (var f in fields)
            {
                // Upsert each field config row keyed by (workspace, entity type, field key).
                await conn.ExecuteAsync("""
                    MERGE core.WorkspaceField AS tgt
                    USING (SELECT @workspaceId AS WorkspaceId, @entityType AS EntityType, @fieldKey AS FieldKey) AS src
                    ON tgt.WorkspaceId=src.WorkspaceId AND tgt.EntityType=src.EntityType AND tgt.FieldKey=src.FieldKey
                    WHEN MATCHED THEN
                        UPDATE SET IsVisible=@isVisible, IsMandatory=@isMandatory
                    WHEN NOT MATCHED THEN
                        INSERT (WorkspaceId, EntityType, FieldKey, IsVisible, IsMandatory)
                        VALUES (@workspaceId, @entityType, @fieldKey, @isVisible, @isMandatory);
                    """, new { workspaceId, entityType = f.EntityType, fieldKey = f.FieldKey, isVisible = f.IsVisible, isMandatory = f.IsMandatory });
            }
            log.Info($"Updated field config for workspace {workspaceId}");
        }
        catch (Exception ex) { log.Error($"Failed to set fields for workspace {workspaceId}", ex); throw; }
    }

    /// <summary>
    /// Replaces a workspace's membership with the supplied set of users (delete-then-insert), so the
    /// final list exactly matches <paramref name="userIds"/>.
    /// </summary>
    public async Task SetUsersAsync(int workspaceId, IEnumerable<int> userIds)
    {
        try
        {
            using var conn = db.Create();
            // Clear existing membership, then re-insert the desired set (full replace).
            await conn.ExecuteAsync(
                "DELETE FROM core.WorkspaceUser WHERE WorkspaceId=@workspaceId", new { workspaceId });
            if (userIds.Any())
                await conn.ExecuteAsync(
                    "INSERT INTO core.WorkspaceUser (WorkspaceId, UserId) VALUES (@workspaceId, @userId)",
                    userIds.Select(uid => new { workspaceId, userId = uid }));
            log.Info($"Updated users for workspace {workspaceId}");
        }
        catch (Exception ex) { log.Error($"Failed to set users for workspace {workspaceId}", ex); throw; }
    }

    /// <summary>Deletes a workspace; the IsDefault=0 guard prevents removing the default workspace.</summary>
    public async Task DeleteAsync(int workspaceId)
    {
        try
        {
            using var conn = db.Create();
            // Guard: never delete the default workspace.
            await conn.ExecuteAsync(
                "DELETE FROM core.Workspace WHERE WorkspaceId=@workspaceId AND IsDefault=0",
                new { workspaceId });
            log.Info($"Deleted workspace {workspaceId}");
        }
        catch (Exception ex) { log.Error($"Failed to delete workspace {workspaceId}", ex); throw; }
    }

    // Batch-loads child collections (fields + member ids) for all given workspaces in two queries
    // and stitches them back onto each workspace, avoiding an N+1 query per workspace.
    private static async Task EnrichAsync(System.Data.IDbConnection conn, List<Workspace> workspaces)
    {
        if (workspaces.Count == 0) return;
        var ids = workspaces.Select(w => w.WorkspaceId).ToArray();

        var fields = (await conn.QueryAsync<WorkspaceField>(
            "SELECT * FROM core.WorkspaceField WHERE WorkspaceId IN @ids", new { ids }))
            .ToLookup(f => f.WorkspaceId);

        var userIds = (await conn.QueryAsync<(int WorkspaceId, int UserId)>(
            "SELECT WorkspaceId, UserId FROM core.WorkspaceUser WHERE WorkspaceId IN @ids", new { ids }))
            .ToLookup(x => x.WorkspaceId, x => x.UserId);

        foreach (var ws in workspaces)
        {
            ws.Fields = fields[ws.WorkspaceId].ToList();
            ws.UserIds = userIds[ws.WorkspaceId].ToList();
        }
    }

    // Builds a URL-safe slug from a workspace name (lowercase, non-alphanumerics collapsed to dashes).
    private static string MakeSlug(string name)
        => Regex.Replace(name.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
}
