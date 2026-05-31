using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

public class ProblemRepository(IDbConnectionFactory db, IWorkspaceContext workspace) : IProblemRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(ProblemRepository));

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

    public async Task<(IEnumerable<Problem> Items, int Total)> GetAllAsync(bool includeResolved = false, int[]? groupIds = null, int page = 1, int pageSize = 25)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            var wid = workspace.WorkspaceId;
            var clauses = new List<string>();
            if (!includeResolved) clauses.Add("st.IsTerminal = 0");
            if (groupIds is { Length: > 0 }) clauses.Add("p.GroupId IN @groupIds");
            clauses.Add("p.WorkspaceId = @wid");
            var where = "AND " + string.Join(" AND ", clauses);
            var offset = (page - 1) * pageSize;

            sql = $"SELECT COUNT(*) FROM itil.Problem p LEFT JOIN lookup.ProblemState st ON st.StateId=p.StateId WHERE p.DeletedAt IS NULL {where}";
            var total = await conn.ExecuteScalarAsync<int>(sql, new { groupIds, wid });

            sql = $"{BaseSelect} {where} ORDER BY p.OpenedAt DESC OFFSET {offset} ROWS FETCH NEXT {pageSize} ROWS ONLY";
            var problems = (await conn.QueryAsync<Problem>(sql, new { groupIds, wid })).ToList();

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

    public async Task<long> CreateAsync(CreateProblemRequest request)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            sql = "SELECT PriorityId FROM lookup.Priority WHERE Code=@c";
            var priorityId = await conn.ExecuteScalarAsync<byte>(sql, new { c = request.PriorityCode });
            sql = "SELECT StateId FROM lookup.ProblemState WHERE Code='investigating'";
            var stateId = await conn.ExecuteScalarAsync<byte>(sql);
            sql = "SELECT UserId FROM core.[User] WHERE ExternalId=@e";
            var assigneeId = request.AssigneeExtId is null ? (int?)null : await conn.ExecuteScalarAsync<int?>(sql, new { e = request.AssigneeExtId });
            sql = "SELECT GroupId FROM core.[Group] WHERE Slug=@s";
            var groupId = request.GroupSlug is null ? (int?)null : await conn.ExecuteScalarAsync<int?>(sql, new { s = request.GroupSlug });
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

    private record ProblemSnapshot(
        string Title, string? PriorityCode, string? GroupName,
        string? AssigneeName, bool IsKnownError, string? RootCause, string? Workaround);

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

            // Record each field that changed
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

    public async Task UpdateStateAsync(long problemId, string stateCode, int? actorUserId)
    {
        string sql = "SELECT StateId FROM lookup.ProblemState WHERE Code=@stateCode";
        try
        {
            using var conn = db.Create();
            var stateId = await conn.ExecuteScalarAsync<byte>(sql, new { stateCode });

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

    public async Task UpdateFieldAsync(long problemId, string field, string? value, int? actorUserId)
    {
        string sql = "UPDATE itil.Problem SET UpdatedAt=SYSUTCDATETIME() WHERE ProblemId=@problemId";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { problemId });
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
