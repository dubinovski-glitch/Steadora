using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

/// <summary>
/// Manages problem records (root-cause/known-error entities that group related incidents): list/detail
/// reads plus create/update/state-change writes. All queries are scoped to the current workspace, and
/// updates compute their own field-level audit events rather than going through a stored proc.
/// </summary>
public class ProblemRepository(IDbConnectionFactory db, IWorkspaceContext workspace) : IProblemRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(ProblemRepository));

    // Shared SELECT projecting a problem plus decoded lookup columns and a computed count of linked,
    // non-deleted incidents. Callers append filter/workspace/ORDER BY onto the trailing WHERE.
    private const string BaseSelect = """
        SELECT
            p.ProblemId, p.Number, p.Title, p.RootCause, p.Workaround,
            p.PriorityId, pr.Code AS PriorityCode,
            p.StateId, st.Code AS StateCode, st.DisplayName AS StateName,
            p.IsKnownError,
            p.AssigneeUserId, asgn.DisplayName AS AssigneeName, asgn.AvatarInitials AS AssigneeInitials, asgn.AvatarColor AS AssigneeColor,
            p.GroupId, grp.Name AS GroupName,
            p.OpenedAt, p.ResolvedAt, p.CreatedAt, p.UpdatedAt,
            (SELECT COUNT(*) FROM itil.Incident i WHERE i.ParentProblemId=p.ProblemId AND i.DeletedAt IS NULL) AS LinkedIncidentCount
        FROM itil.Problem p
        LEFT JOIN lookup.Priority      pr   ON pr.PriorityId = p.PriorityId
        LEFT JOIN lookup.ProblemState  st   ON st.StateId    = p.StateId
        LEFT JOIN core.[User]          asgn ON asgn.UserId   = p.AssigneeUserId
        LEFT JOIN core.[Group]         grp  ON grp.GroupId   = p.GroupId
        WHERE p.DeletedAt IS NULL
        """;

    /// <summary>
    /// Returns one page of problems plus the total count, optionally hiding terminal states and limiting to
    /// given groups and/or an assignee, scoped to the current workspace. Each problem is enriched with its
    /// affected service slugs.
    /// </summary>
    public async Task<(IEnumerable<Problem> Items, int Total)> GetAllAsync(bool includeResolved = false, int[]? groupIds = null, int? assigneeUserId = null, int page = 1, int pageSize = 25)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            var wid = workspace.WorkspaceId;
            // Build the dynamic WHERE: hide terminal states unless asked, optional group/assignee filters,
            // and the mandatory workspace scope (tenant isolation).
            var clauses = new List<string>();
            if (!includeResolved) clauses.Add("st.IsTerminal = 0");
            if (groupIds is { Length: > 0 }) clauses.Add("p.GroupId IN @groupIds");
            if (assigneeUserId is not null) clauses.Add("p.AssigneeUserId = @assigneeUserId");
            clauses.Add("p.WorkspaceId = @wid");
            var where = "AND " + string.Join(" AND ", clauses);
            var offset = (page - 1) * pageSize;

            // Total count for pagination, then the windowed page itself.
            sql = $"SELECT COUNT(*) FROM itil.Problem p LEFT JOIN lookup.ProblemState st ON st.StateId=p.StateId WHERE p.DeletedAt IS NULL {where}";
            var total = await conn.ExecuteScalarAsync<int>(sql, new { groupIds, assigneeUserId, wid });

            sql = $"{BaseSelect} {where} ORDER BY p.OpenedAt DESC OFFSET {offset} ROWS FETCH NEXT {pageSize} ROWS ONLY";
            var problems = (await conn.QueryAsync<Problem>(sql, new { groupIds, assigneeUserId, wid })).ToList();

            // Batch-load affected service slugs for the whole page in one query (avoids N+1).
            if (problems.Count > 0)
            {
                var ids = problems.Select(p => p.ProblemId).ToArray();
                sql = "SELECT ps.ProblemId, s.Slug FROM itil.ProblemService ps JOIN core.Service s ON s.ServiceId=ps.ServiceId WHERE ps.ProblemId IN @ids";
                var svcLinks = await conn.QueryAsync<(long ProblemId, string Slug)>(sql, new { ids });
                var lookup = svcLinks.ToLookup(x => x.ProblemId, x => x.Slug);
                foreach (var p in problems) p.AffectedServiceSlugs = lookup[p.ProblemId].ToList();
            }
            return (problems, total);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get problems", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Returns a single problem's full detail by id (workspace-scoped), with its affected service slugs
    /// loaded in a follow-up query; null if not found.
    /// </summary>
    public async Task<Problem?> GetByIdAsync(long problemId)
    {
        string sql = $"{BaseSelect} AND p.ProblemId=@problemId AND p.WorkspaceId=@wid";
        try
        {
            using var conn = db.Create();
            var problem = await conn.QueryFirstOrDefaultAsync<Problem>(sql, new { problemId, wid = workspace.WorkspaceId });
            if (problem is null) return null;
            sql = "SELECT s.Slug FROM itil.ProblemService ps JOIN core.Service s ON s.ServiceId=ps.ServiceId WHERE ps.ProblemId=@problemId";
            var slugs = await conn.QueryAsync<string>(sql, new { problemId });
            problem.AffectedServiceSlugs = slugs.ToList();
            return problem;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get problem {problemId}", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Creates a new problem: resolves the priority/initial-state/assignee/group references, draws the next
    /// number from a sequence, and inserts the row stamped with the current workspace. Returns the new id.
    /// </summary>
    public async Task<long> CreateAsync(CreateProblemRequest request)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            // Resolve codes/slugs to ids; new problems always start in the 'investigating' state.
            sql = "SELECT PriorityId FROM lookup.Priority WHERE Code=@c";
            var priorityId = await conn.ExecuteScalarAsync<byte>(sql, new { c = request.PriorityCode });
            sql = "SELECT StateId FROM lookup.ProblemState WHERE Code='investigating'";
            var stateId = await conn.ExecuteScalarAsync<byte>(sql);
            sql = "SELECT UserId FROM core.[User] WHERE ExternalId=@e";
            var assigneeId = request.AssigneeExtId is null ? (int?)null : await conn.ExecuteScalarAsync<int?>(sql, new { e = request.AssigneeExtId });
            sql = "SELECT GroupId FROM core.[Group] WHERE Slug=@s";
            var groupId = request.GroupSlug is null ? (int?)null : await conn.ExecuteScalarAsync<int?>(sql, new { s = request.GroupSlug });
            // Draw the next problem number from the dedicated sequence.
            sql = "SELECT NEXT VALUE FOR itil.ProblemSeq";
            var newId = await conn.ExecuteScalarAsync<long>(sql);
            sql = """
                INSERT INTO itil.Problem (ProblemId,Title,RootCause,Workaround,PriorityId,StateId,IsKnownError,AssigneeUserId,GroupId,WorkspaceId,OpenedAt,CreatedAt,UpdatedAt)
                VALUES (@newId,@title,@rootCause,@workaround,@priorityId,@stateId,@isKnown,@assigneeId,@groupId,@wid,SYSUTCDATETIME(),SYSUTCDATETIME(),SYSUTCDATETIME())
                """;
            var wid = workspace.WorkspaceId;
            await conn.ExecuteAsync(sql, new { newId, title = request.Title, rootCause = request.RootCause, workaround = request.Workaround, priorityId, stateId, isKnown = request.IsKnownError, assigneeId, groupId, wid });
            log.Info($"Created problem {newId}: {request.Title}");
            return newId;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create problem: {request.Title}", sql, ex);
            throw;
        }
    }

    // Snapshot of a problem's "before" values, captured pre-update so UpdateAsync can diff old vs. new
    // and emit one audit event per changed field.
    private record ProblemSnapshot(
        string Title, string? PriorityCode, string? GroupName,
        string? AssigneeName, bool IsKnownError, string? RootCause, string? Workaround);

    /// <summary>
    /// Applies a full edit to a problem and writes a per-field audit trail: it snapshots the old values,
    /// resolves the new references and display names, updates the row, then diffs and records each change.
    /// </summary>
    public async Task UpdateAsync(long problemId, UpdateProblemRequest request)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();

            // Resolve actor
            sql = "SELECT UserId FROM core.[User] WHERE ExternalId=@e";
            var actorId = request.ActorExtId is null ? (int?)null
                : await conn.ExecuteScalarAsync<int?>(sql, new { e = request.ActorExtId });

            // Read old values for change detection
            sql = """
                SELECT p.Title, pr.Code AS PriorityCode, grp.Name AS GroupName,
                       asgn.DisplayName AS AssigneeName, p.IsKnownError,
                       p.RootCause, p.Workaround
                FROM itil.Problem p
                LEFT JOIN lookup.Priority pr   ON pr.PriorityId  = p.PriorityId
                LEFT JOIN core.[Group]    grp  ON grp.GroupId    = p.GroupId
                LEFT JOIN core.[User]     asgn ON asgn.UserId    = p.AssigneeUserId
                WHERE p.ProblemId = @problemId
                """;
            var old = await conn.QueryFirstAsync<ProblemSnapshot>(sql, new { problemId });

            // Resolve lookup IDs
            sql = "SELECT PriorityId FROM lookup.Priority WHERE Code=@c";
            var priorityId = await conn.ExecuteScalarAsync<byte>(sql, new { c = request.PriorityCode });
            sql = "SELECT UserId FROM core.[User] WHERE ExternalId=@e";
            var assigneeId = request.AssigneeExtId is null ? (int?)null
                : await conn.ExecuteScalarAsync<int?>(sql, new { e = request.AssigneeExtId });
            sql = "SELECT GroupId FROM core.[Group] WHERE Slug=@s";
            var groupId = request.GroupSlug is null ? (int?)null
                : await conn.ExecuteScalarAsync<int?>(sql, new { s = request.GroupSlug });

            // Resolve new display names
            sql = "SELECT Name FROM core.[Group] WHERE GroupId=@groupId";
            var newGroupName = groupId is null ? (string?)null
                : await conn.ExecuteScalarAsync<string?>(sql, new { groupId });
            sql = "SELECT DisplayName FROM core.[User] WHERE UserId=@assigneeId";
            var newAssigneeName = assigneeId is null ? (string?)null
                : await conn.ExecuteScalarAsync<string?>(sql, new { assigneeId });

            sql = """
                UPDATE itil.Problem
                SET Title=@title, RootCause=@rootCause, Workaround=@workaround,
                    PriorityId=@priorityId, AssigneeUserId=@assigneeId, GroupId=@groupId,
                    IsKnownError=@isKnownError, UpdatedAt=SYSUTCDATETIME()
                WHERE ProblemId=@problemId
                """;
            await conn.ExecuteAsync(sql, new {
                problemId, title = request.Title, rootCause = request.RootCause,
                workaround = request.Workaround, priorityId, assigneeId, groupId,
                isKnownError = request.IsKnownError
            });

            // Record each field that changed (diff old snapshot vs. request; RootCause/Workaround log the
            // fact of the change without storing the bulky before/after text).
            var changes = new List<(string Field, string? OldVal, string? NewVal)>();
            if (old.Title != request.Title)
                changes.Add(("Title", old.Title, request.Title));
            if (old.PriorityCode != request.PriorityCode)
                changes.Add(("Priority", old.PriorityCode, request.PriorityCode));
            if (old.GroupName != newGroupName)
                changes.Add(("Assignment Team", old.GroupName, newGroupName));
            if (old.AssigneeName != newAssigneeName)
                changes.Add(("Assignee", old.AssigneeName, newAssigneeName));
            if (old.IsKnownError != request.IsKnownError)
                changes.Add(("Known Error", old.IsKnownError ? "Yes" : "No", request.IsKnownError ? "Yes" : "No"));
            if (old.RootCause != request.RootCause)
                changes.Add(("Root Cause", null, null));
            if (old.Workaround != request.Workaround)
                changes.Add(("Workaround", null, null));

            foreach (var (field, oldVal, newVal) in changes)
            {
                sql = "INSERT INTO audit.ActivityEvent (ParentType,ParentId,ActorUserId,Kind,Field,OldValue,NewValue) VALUES ('PRB',@problemId,@actorId,'field_changed',@field,@oldVal,@newVal)";
                await conn.ExecuteAsync(sql, new { problemId, actorId, field, oldVal, newVal });
            }

            log.Info($"Updated problem {problemId}: {request.Title}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update problem {problemId}", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Transitions a problem to a new state, stamping ResolvedAt when moving to 'closed', and records a
    /// state-change audit event only when the state actually differs.
    /// </summary>
    public async Task UpdateStateAsync(long problemId, string stateCode, int? actorUserId)
    {
        string sql = "SELECT StateId FROM lookup.ProblemState WHERE Code=@stateCode";
        try
        {
            using var conn = db.Create();
            var stateId = await conn.ExecuteScalarAsync<byte>(sql, new { stateCode });

            // Capture the current state code so we only log an event on an actual change.
            sql = "SELECT st.Code FROM itil.Problem p JOIN lookup.ProblemState st ON st.StateId=p.StateId WHERE p.ProblemId=@problemId";
            var oldCode = await conn.ExecuteScalarAsync<string?>(sql, new { problemId });

            sql = "UPDATE itil.Problem SET StateId=@stateId, ResolvedAt=CASE WHEN @stateCode='closed' THEN SYSUTCDATETIME() ELSE ResolvedAt END, UpdatedAt=SYSUTCDATETIME() WHERE ProblemId=@problemId";
            await conn.ExecuteAsync(sql, new { problemId, stateId, stateCode });

            if (oldCode != stateCode)
            {
                sql = "INSERT INTO audit.ActivityEvent (ParentType,ParentId,ActorUserId,Kind,Field,OldValue,NewValue) VALUES ('PRB',@problemId,@actorUserId,'field_changed','State',@oldCode,@stateCode)";
                await conn.ExecuteAsync(sql, new { problemId, actorUserId, oldCode, stateCode });
            }

            log.Info($"Problem {problemId} state changed to {stateCode}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update state on problem {problemId}", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Records a generic field change on a problem: bumps UpdatedAt and writes a field-changed audit event.
    /// Used for fields tracked only for history rather than stored in dedicated columns.
    /// </summary>
    public async Task UpdateFieldAsync(long problemId, string field, string? value, int? actorUserId)
    {
        string sql = "UPDATE itil.Problem SET UpdatedAt=SYSUTCDATETIME() WHERE ProblemId=@problemId";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { problemId });
            // Audit-only: persist the change as an activity event.
            sql = "INSERT INTO audit.ActivityEvent (ParentType,ParentId,ActorUserId,Kind,Field,NewValue) VALUES ('PRB',@problemId,@actorUserId,'field_changed',@field,@value)";
            await conn.ExecuteAsync(sql, new { problemId, actorUserId, field, value });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update field {field} on problem {problemId}", sql, ex);
            throw;
        }
    }
}
