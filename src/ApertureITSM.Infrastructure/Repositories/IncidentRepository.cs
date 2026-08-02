using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

/// <summary>
/// Manages incident records — the core ticket entity — including the read-side queue/detail queries and
/// the write-side lifecycle operations (create, edit, status/assignee/priority changes, problem linking,
/// soft delete). Every query is scoped to the caller's current workspace via <see cref="IWorkspaceContext"/>,
/// and mutating operations go through stored procedures that also write the audit trail and SLA bookkeeping.
/// </summary>
public class IncidentRepository(IDbConnectionFactory db, IWorkspaceContext workspace) : IIncidentRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(IncidentRepository));

    // Shared SELECT projecting an incident plus all its decoded lookup/display columns and two computed
    // counts (comments, linked records). Reused by the list, detail, and by-problem queries; callers append
    // their own filter, workspace, and ORDER BY clauses onto the trailing "WHERE i.DeletedAt IS NULL".
    private const string BaseSelect = """
        SELECT
            i.IncidentId, i.Number, i.Title, i.Description, i.StepsToReproduce,
            i.PriorityId, pr.Code AS PriorityCode,
            i.StatusId, st.Code AS StatusCode,
            i.ImpactId, imp.Code AS ImpactCode,
            i.UrgencyId, urg.Code AS UrgencyCode,
            i.SeverityId, sev.Code AS SeverityCode,
            i.CategoryId, cat.DisplayName AS CategoryName,
            i.SubCategoryId, scat.Code AS SubCategoryCode, scat.DisplayName AS SubCategoryName,
            i.ServiceId, svc.Name AS ServiceName,
            i.CiId, ci.AssetTag AS CiAssetTag,
            i.ReporterUserId, rep.DisplayName AS ReporterName, i.ReporterDisplay,
            i.CallerUserId, caller.DisplayName AS CallerName,
            i.ContactMethodId, cm.Code AS ContactMethodCode,
            i.Location,
            i.AssigneeUserId, asgn.DisplayName AS AssigneeName, asgn.AvatarInitials AS AssigneeInitials, asgn.AvatarColor AS AssigneeColor,
            i.GroupId, grp.Name AS GroupName,
            i.IsMajorIncident, i.ReassignCount,
            i.ResolutionCodeId, rc.Code AS ResolutionCode, rc.DisplayName AS ResolutionCodeName,
            i.ResolutionNotes,
            i.SlaPolicyId, i.SlaTargetMinutes, i.SlaResponseTargetMinutes, i.SlaStartedAt,
            i.SlaPausedSeconds, i.SlaPausedAt, i.SlaBreachedAt, i.SlaWarnedAt,
            i.FirstResponseAt, i.ReopenCount,
            i.OpenedAt, i.ResolvedAt, i.ClosedAt,
            i.ParentProblemId, prb.Number AS ParentProblemNumber,
            i.RelatedChangeId,
            i.CsatScore, i.IsFirstCallResolution,
            i.CreatedAt, i.UpdatedAt,
            (SELECT COUNT(*) FROM audit.Comment c WHERE c.ParentType='INC' AND c.ParentId=i.IncidentId AND c.DeletedAt IS NULL) AS CommentCount,
            (SELECT COUNT(*) FROM itil.IncidentLink lnk WHERE lnk.IncidentId=i.IncidentId) AS LinkedCount
        FROM itil.Incident i
        LEFT JOIN lookup.Priority        pr     ON pr.PriorityId     = i.PriorityId
        LEFT JOIN lookup.IncidentStatus  st     ON st.StatusId       = i.StatusId
        LEFT JOIN lookup.Impact          imp    ON imp.ImpactId      = i.ImpactId
        LEFT JOIN lookup.Urgency         urg    ON urg.UrgencyId     = i.UrgencyId
        LEFT JOIN lookup.Severity        sev    ON sev.SeverityId    = i.SeverityId
        LEFT JOIN lookup.Category        cat    ON cat.CategoryId    = i.CategoryId
        LEFT JOIN lookup.SubCategory     scat   ON scat.SubCategoryId = i.SubCategoryId
        LEFT JOIN lookup.ContactMethod   cm     ON cm.ContactMethodId = i.ContactMethodId
        LEFT JOIN lookup.ResolutionCode  rc     ON rc.ResolutionCodeId = i.ResolutionCodeId
        LEFT JOIN core.Service           svc    ON svc.ServiceId     = i.ServiceId
        LEFT JOIN core.ConfigurationItem ci     ON ci.CiId           = i.CiId
        LEFT JOIN core.[User]            rep    ON rep.UserId        = i.ReporterUserId
        LEFT JOIN core.[User]            caller ON caller.UserId     = i.CallerUserId
        LEFT JOIN core.[User]            asgn   ON asgn.UserId       = i.AssigneeUserId
        LEFT JOIN core.[Group]           grp    ON grp.GroupId       = i.GroupId
        LEFT JOIN itil.Problem           prb    ON prb.ProblemId     = i.ParentProblemId
        WHERE i.DeletedAt IS NULL
        """;

    /// <summary>
    /// Returns one page of the incident queue plus the total matching count, filtered by the given criteria,
    /// sorted, and scoped to the current workspace. Runs a COUNT and a windowed SELECT against the same WHERE.
    /// </summary>
    public async Task<(IEnumerable<Incident> Items, int Total)> GetPagedAsync(IncidentFilter filter, int page, int pageSize)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            // Build the dynamic WHERE from the filter, then bolt on the workspace scope so a tenant
            // can never see another workspace's incidents.
            var where = BuildWhere(filter, out var p);
            p.Add("wid", workspace.WorkspaceId);
            var wsWhere = where + " AND i.WorkspaceId = @wid";
            var offset = (page - 1) * pageSize;
            // Whitelist the sort column (avoids SQL injection from a user-supplied sort key); default UpdatedAt.
            var sortCol = filter.SortBy switch
            {
                "OpenedAt"    => "i.OpenedAt",
                "PriorityId"  => "i.PriorityId",
                "Title"       => "i.Title",
                "StatusId"    => "i.StatusId",
                "ServiceName" => "svc.Name",
                "AssigneeName"=> "asgn.DisplayName",
                _             => "i.UpdatedAt"
            };
            var dir = filter.SortDesc ? "DESC" : "ASC";

            // Total row count for pagination (same filters, no projection/paging).
            sql = $"SELECT COUNT(*) FROM itil.Incident i WHERE i.DeletedAt IS NULL {wsWhere}";
            var total = await conn.ExecuteScalarAsync<int>(sql, p);
            // The page itself: full projection, sorted, windowed via OFFSET/FETCH.
            sql = $"{BaseSelect} {wsWhere} ORDER BY {sortCol} {dir} OFFSET {offset} ROWS FETCH NEXT {pageSize} ROWS ONLY";
            var items = await conn.QueryAsync<Incident>(sql, p);
            return (items, total);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get paged incidents", sql, ex);
            throw;
        }
    }

    /// <summary>Returns a single incident's full detail by id, scoped to the current workspace; null if not found.</summary>
    public async Task<Incident?> GetByIdAsync(long incidentId)
    {
        string sql = $"{BaseSelect} AND i.IncidentId = @incidentId AND i.WorkspaceId = @wid";
        try
        {
            using var conn = db.Create();
            return await conn.QueryFirstOrDefaultAsync<Incident>(sql, new { incidentId, wid = workspace.WorkspaceId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get incident {incidentId}", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Creates a new incident via the stored proc (which resolves codes/slugs to ids, assigns the next
    /// number, and seeds SLA timers), stamping it with the current workspace. Returns the new incident id.
    /// </summary>
    public async Task<long> CreateAsync(CreateIncidentRequest request)
    {
        string sql = "itil.usp_CreateIncident";
        try
        {
            using var conn = db.Create();
            var p = new DynamicParameters();
            p.Add("@Title", request.Title);
            p.Add("@Description", request.Description);
            p.Add("@PriorityCode", request.PriorityCode);
            p.Add("@CategoryCode", request.CategoryCode);
            p.Add("@SubCategoryCode", request.SubCategoryCode);
            p.Add("@ServiceSlug", request.ServiceSlug);
            p.Add("@CiAssetTag", request.CiAssetTag);
            p.Add("@ReporterExtId", request.ReporterExtId);
            p.Add("@ReporterDisplay", request.ReporterDisplay);
            p.Add("@CallerExtId", request.CallerExtId);
            p.Add("@ContactMethodCode", request.ContactMethodCode);
            p.Add("@Location", request.Location);
            p.Add("@AssigneeExtId", request.AssigneeExtId);
            p.Add("@GroupSlug", request.GroupSlug);
            p.Add("@ImpactCode", request.ImpactCode);
            p.Add("@UrgencyCode", request.UrgencyCode);
            p.Add("@SeverityCode", request.SeverityCode);
            p.Add("@IsMajorIncident", request.IsMajorIncident);
            p.Add("@ResolutionCodeCode", request.ResolutionCodeCode);
            p.Add("@ResolutionNotes", request.ResolutionNotes);
            p.Add("@CreatedByExtId", request.CreatedByExtId);
            // Stamp the new record with the caller's workspace for tenant isolation.
            p.Add("@WorkspaceId", workspace.WorkspaceId);
            // Output param receives the generated incident id from the proc.
            p.Add("@NewIncidentId", dbType: System.Data.DbType.Int64, direction: System.Data.ParameterDirection.Output);
            await conn.ExecuteAsync(sql, p, commandType: System.Data.CommandType.StoredProcedure);
            var newId = p.Get<long>("@NewIncidentId");
            log.Info($"Created incident {newId}: {request.Title}");
            return newId;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create incident: {request.Title}", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Applies a full field edit to an incident via the stored proc, which resolves codes/slugs to ids,
    /// records field-level audit events, and updates SLA state as needed.
    /// </summary>
    public async Task UpdateAsync(long incidentId, UpdateIncidentRequest request)
    {
        string sql = "itil.usp_UpdateIncident";
        try
        {
            using var conn = db.Create();
            var p = new DynamicParameters();
            p.Add("@IncidentId",         incidentId);
            p.Add("@Title",              request.Title);
            p.Add("@Description",        request.Description);
            p.Add("@CallerExtId",        request.CallerExtId);
            p.Add("@ContactMethodCode",  request.ContactMethodCode);
            p.Add("@Location",           request.Location);
            p.Add("@ServiceSlug",        request.ServiceSlug);
            p.Add("@CategoryCode",       request.CategoryCode);
            p.Add("@SubCategoryCode",    request.SubCategoryCode);
            p.Add("@CiAssetTag",         request.CiAssetTag);
            p.Add("@PriorityCode",       request.PriorityCode);
            p.Add("@ImpactCode",         request.ImpactCode);
            p.Add("@UrgencyCode",        request.UrgencyCode);
            p.Add("@SeverityCode",       request.SeverityCode);
            p.Add("@IsMajorIncident",    request.IsMajorIncident);
            p.Add("@GroupSlug",          request.GroupSlug);
            p.Add("@AssigneeExtId",      request.AssigneeExtId);
            p.Add("@ResolutionCodeCode", request.ResolutionCodeCode);
            p.Add("@ResolutionNotes",    request.ResolutionNotes);
            p.Add("@ActorExtId",         request.ActorExtId);
            await conn.ExecuteAsync(sql, p, commandType: System.Data.CommandType.StoredProcedure);
            log.Info($"Updated incident {incidentId}: {request.Title}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update incident {incidentId}", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Transitions an incident to a new status via the stored proc (which enforces valid transitions and
    /// stamps resolved/closed timestamps and SLA pauses). Records the acting user for the audit trail.
    /// </summary>
    public async Task UpdateStatusAsync(long incidentId, string statusCode, int? actorUserId)
    {
        string sql = "itil.usp_ChangeIncidentStatus";
        try
        {
            using var conn = db.Create();
            // The proc identifies the actor by external id, so translate the numeric user id first.
            var actorExtId = actorUserId.HasValue ? await GetExtIdAsync(conn, actorUserId.Value) : null;
            await conn.ExecuteAsync(sql,
                new { IncidentId = incidentId, StatusCode = statusCode, ActorExtId = actorExtId },
                commandType: System.Data.CommandType.StoredProcedure);
            log.Info($"Incident {incidentId} status changed to {statusCode}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update status on incident {incidentId}", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Assigns (or unassigns, when null) an incident to a user via the stored proc, bumping the reassign
    /// count and writing the audit event. Records the acting user for the audit trail.
    /// </summary>
    public async Task UpdateAssigneeAsync(long incidentId, string? assigneeExtId, int? actorUserId)
    {
        string sql = "itil.usp_AssignIncident";
        try
        {
            using var conn = db.Create();
            // The proc identifies the actor by external id, so translate the numeric user id first.
            var actorExtId = actorUserId.HasValue ? await GetExtIdAsync(conn, actorUserId.Value) : null;
            await conn.ExecuteAsync(sql,
                new { IncidentId = incidentId, AssigneeExtId = assigneeExtId, ActorExtId = actorExtId },
                commandType: System.Data.CommandType.StoredProcedure);
            log.Info($"Incident {incidentId} assigned to {assigneeExtId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to assign incident {incidentId}", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Changes an incident's priority inline (without the full update proc): resolves the priority code,
    /// writes the new value, and records a field-changed audit event.
    /// </summary>
    public async Task UpdatePriorityAsync(long incidentId, string priorityCode, int? actorUserId)
    {
        string sql = "SELECT PriorityId FROM lookup.Priority WHERE Code=@priorityCode";
        try
        {
            using var conn = db.Create();
            // Resolve the priority code to its id, update the row, then log the change to the activity feed.
            var priorityId = await conn.ExecuteScalarAsync<byte>(sql, new { priorityCode });
            var actorId = actorUserId;
            sql = "UPDATE itil.Incident SET PriorityId=@priorityId, UpdatedAt=SYSUTCDATETIME() WHERE IncidentId=@incidentId";
            await conn.ExecuteAsync(sql, new { incidentId, priorityId });
            sql = "INSERT INTO audit.ActivityEvent (ParentType,ParentId,ActorUserId,Kind,Field,NewValue) VALUES ('INC',@incidentId,@actorId,'field_changed','PriorityId',@priorityCode)";
            await conn.ExecuteAsync(sql, new { incidentId, actorId, priorityCode });
            log.Info($"Incident {incidentId} priority changed to {priorityCode}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update priority on incident {incidentId}", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Records a generic field change on an incident: bumps UpdatedAt and writes a field-changed audit
    /// event. Used for fields tracked only for audit/history rather than stored in dedicated columns.
    /// </summary>
    public async Task UpdateFieldAsync(long incidentId, string field, string? value, int? actorUserId)
    {
        string sql = "UPDATE itil.Incident SET UpdatedAt=SYSUTCDATETIME() WHERE IncidentId=@incidentId";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { incidentId });
            // Audit-only: persist the change as an activity event.
            sql = "INSERT INTO audit.ActivityEvent (ParentType,ParentId,ActorUserId,Kind,Field,NewValue) VALUES ('INC',@incidentId,@actorUserId,'field_changed',@field,@value)";
            await conn.ExecuteAsync(sql, new { incidentId, actorUserId, field, value });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update field {field} on incident {incidentId}", sql, ex);
            throw;
        }
    }

    /// <summary>Links an incident to a parent problem via the stored proc, recording the actor for audit.</summary>
    public async Task LinkToProblemAsync(long incidentId, long problemId, int? actorUserId)
    {
        string sql = "itil.usp_LinkIncidentToProblem";
        try
        {
            using var conn = db.Create();
            // The proc identifies the actor by external id, so translate the numeric user id first.
            var actorExtId = actorUserId.HasValue ? await GetExtIdAsync(conn, actorUserId.Value) : null;
            await conn.ExecuteAsync(sql,
                new { IncidentId = incidentId, ProblemId = problemId, ActorExtId = actorExtId },
                commandType: System.Data.CommandType.StoredProcedure);
            log.Info($"Incident {incidentId} linked to problem {problemId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to link incident {incidentId} to problem {problemId}", sql, ex);
            throw;
        }
    }

    /// <summary>Returns the incidents linked to a given parent problem (newest first), workspace-scoped.</summary>
    public async Task<IEnumerable<Incident>> GetByProblemIdAsync(long problemId)
    {
        string sql = $"{BaseSelect} AND i.ParentProblemId = @problemId AND i.WorkspaceId = @wid ORDER BY i.OpenedAt DESC";
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<Incident>(sql, new { problemId, wid = workspace.WorkspaceId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get incidents for problem {problemId}", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Soft-deletes an incident by stamping DeletedAt; the row is retained for audit but excluded from all
    /// queries (which filter on DeletedAt IS NULL).
    /// </summary>
    public async Task SoftDeleteAsync(long incidentId, int? actorUserId)
    {
        string sql = "UPDATE itil.Incident SET DeletedAt=SYSUTCDATETIME(), UpdatedAt=SYSUTCDATETIME() WHERE IncidentId=@incidentId";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { incidentId });
            log.Info($"Incident {incidentId} soft-deleted");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to delete incident {incidentId}", sql, ex);
            throw;
        }
    }

    // Translates an IncidentFilter into a parameterized "AND ..." WHERE fragment plus its parameters.
    // Only clauses for the provided filter values are emitted, so the query stays as narrow as the request.
    private static string BuildWhere(IncidentFilter f, out DynamicParameters p)
    {
        p = new DynamicParameters();
        var clauses = new List<string>();
        if (!string.IsNullOrWhiteSpace(f.Search)) { clauses.Add("(i.Title LIKE @search OR i.Number LIKE @search)"); p.Add("@search", $"%{f.Search}%"); }
        if (!string.IsNullOrWhiteSpace(f.StatusCode)) { clauses.Add("i.StatusId=(SELECT StatusId FROM lookup.IncidentStatus WHERE Code=@statusCode)"); p.Add("@statusCode", f.StatusCode); }
        if (!string.IsNullOrWhiteSpace(f.PriorityCode)) { clauses.Add("i.PriorityId=(SELECT PriorityId FROM lookup.Priority WHERE Code=@priorityCode)"); p.Add("@priorityCode", f.PriorityCode); }
        if (f.AssigneeUserId.HasValue) { clauses.Add("i.AssigneeUserId=@assigneeUserId"); p.Add("@assigneeUserId", f.AssigneeUserId); }
        if (f.GroupId.HasValue) { clauses.Add("i.GroupId=@groupId"); p.Add("@groupId", f.GroupId); }
        if (f.GroupIds is { Length: > 0 }) { clauses.Add("i.GroupId IN @groupIds"); p.Add("@groupIds", f.GroupIds); }
        if (f.ServiceIds is { Length: > 0 }) { clauses.Add("i.ServiceId IN @serviceIds"); p.Add("@serviceIds", f.ServiceIds); }
        if (f.OnlyUnassigned) clauses.Add("i.AssigneeUserId IS NULL");
        // "At risk" = already breached, or elapsed (minus paused time) has reached 80% of the SLA target.
        if (f.OnlySlaAtRisk) clauses.Add("(i.SlaBreachedAt IS NOT NULL OR (i.SlaTargetMinutes IS NOT NULL AND i.SlaStartedAt IS NOT NULL AND DATEDIFF(MINUTE,i.SlaStartedAt,SYSUTCDATETIME())-(i.SlaPausedSeconds/60) >= i.SlaTargetMinutes*80/100))");
        // By default hide terminal (resolved/closed) incidents so the queue shows only active work.
        if (!f.IncludeResolved) clauses.Add("i.StatusId NOT IN (SELECT StatusId FROM lookup.IncidentStatus WHERE IsTerminal=1)");
        return clauses.Count > 0 ? "AND " + string.Join(" AND ", clauses) : string.Empty;
    }

    // Maps an internal numeric user id to the external id expected by the stored procs.
    private static async Task<string?> GetExtIdAsync(System.Data.IDbConnection conn, int userId)
        => await conn.ExecuteScalarAsync<string?>("SELECT ExternalId FROM core.[User] WHERE UserId=@userId", new { userId });
}
