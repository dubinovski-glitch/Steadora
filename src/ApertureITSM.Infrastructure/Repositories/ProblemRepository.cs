using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

public class ProblemRepository(IDbConnectionFactory db) : IProblemRepository
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

    public async Task<IEnumerable<Problem>> GetAllAsync(bool includeResolved = false)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            var where = includeResolved ? string.Empty : "AND st.IsTerminal = 0";
            sql = $"{BaseSelect} {where} ORDER BY p.OpenedAt DESC";
            var problems = (await conn.QueryAsync<Problem>(sql)).ToList();

            if (problems.Count > 0)
            {
                var ids = problems.Select(p => p.ProblemId).ToArray();
                sql = "SELECT ps.ProblemId, s.Slug FROM itil.ProblemService ps JOIN core.Service s ON s.ServiceId=ps.ServiceId WHERE ps.ProblemId IN @ids";
                var svcLinks = await conn.QueryAsync<(long ProblemId, string Slug)>(sql, new { ids });
                var lookup = svcLinks.ToLookup(x => x.ProblemId, x => x.Slug);
                foreach (var p in problems) p.AffectedServiceSlugs = lookup[p.ProblemId].ToList();
            }
            return problems;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get problems", sql, ex);
            throw;
        }
    }

    public async Task<Problem?> GetByIdAsync(long problemId)
    {
        string sql = $"{BaseSelect} AND p.ProblemId=@problemId";
        try
        {
            using var conn = db.Create();
            var problem = await conn.QueryFirstOrDefaultAsync<Problem>(sql, new { problemId });
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
                INSERT INTO itil.Problem (ProblemId,Title,RootCause,Workaround,PriorityId,StateId,IsKnownError,AssigneeUserId,GroupId,OpenedAt,CreatedAt,UpdatedAt)
                VALUES (@newId,@title,@rootCause,@workaround,@priorityId,@stateId,@isKnown,@assigneeId,@groupId,SYSUTCDATETIME(),SYSUTCDATETIME(),SYSUTCDATETIME())
                """;
            await conn.ExecuteAsync(sql, new { newId, title = request.Title, rootCause = request.RootCause, workaround = request.Workaround, priorityId, stateId, isKnown = request.IsKnownError, assigneeId, groupId });
            log.Info($"Created problem {newId}: {request.Title}");
            return newId;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create problem: {request.Title}", sql, ex);
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
            sql = "UPDATE itil.Problem SET StateId=@stateId, ResolvedAt=CASE WHEN @stateCode='closed' THEN SYSUTCDATETIME() ELSE ResolvedAt END, UpdatedAt=SYSUTCDATETIME() WHERE ProblemId=@problemId";
            await conn.ExecuteAsync(sql, new { problemId, stateId, stateCode });
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
