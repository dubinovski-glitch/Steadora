using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

public class ChangeRepository(IDbConnectionFactory db, IWorkspaceContext workspace) : IChangeRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(ChangeRepository));

    private const string BaseSelect = """
        SELECT
            c.ChangeId, c.Number, c.Title, c.Description, c.RolloutPlan, c.RollbackPlan, c.ImpactNotes,
            c.ChangeTypeId, ct.Code AS ChangeTypeCode,
            c.RiskId, rk.Code AS RiskCode,
            c.StateId, cs.Code AS StateCode, cs.DisplayName AS StateName,
            c.OwnerUserId, own.DisplayName AS OwnerName, own.AvatarInitials AS OwnerInitials, own.AvatarColor AS OwnerColor,
            c.ApproverUserId, apr.DisplayName AS ApproverName,
            c.GroupId, grp.Name AS GroupName,
            c.CabName, c.ScheduledStart, c.ScheduledEnd, c.DowntimeEstimate,
            c.SubmittedAt, c.ApprovedAt, c.CompletedAt,
            c.CreatedAt, c.UpdatedAt
        FROM itil.[Change] c
        LEFT JOIN lookup.ChangeType  ct  ON ct.ChangeTypeId = c.ChangeTypeId
        LEFT JOIN lookup.Risk        rk  ON rk.RiskId       = c.RiskId
        LEFT JOIN lookup.ChangeState cs  ON cs.StateId      = c.StateId
        LEFT JOIN core.[User]        own ON own.UserId       = c.OwnerUserId
        LEFT JOIN core.[User]        apr ON apr.UserId       = c.ApproverUserId
        LEFT JOIN core.[Group]       grp ON grp.GroupId      = c.GroupId
        WHERE c.DeletedAt IS NULL
        """;

    public async Task<IEnumerable<Change>> GetAllAsync(string? stateFilter = null)
    {
        string sql = $"{BaseSelect} {(stateFilter is not null ? "AND cs.Code=@stateFilter" : "")} AND c.WorkspaceId=@wid ORDER BY c.UpdatedAt DESC";
        try
        {
            using var conn = db.Create();
            var changes = (await conn.QueryAsync<Change>(sql, new { stateFilter, wid = workspace.WorkspaceId })).ToList();
            await EnrichAsync(conn, changes);
            return changes;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get changes", sql, ex);
            throw;
        }
    }

    public async Task<Change?> GetByIdAsync(long changeId)
    {
        string sql = $"{BaseSelect} AND c.ChangeId=@changeId AND c.WorkspaceId=@wid";
        try
        {
            using var conn = db.Create();
            var change = await conn.QueryFirstOrDefaultAsync<Change>(sql, new { changeId, wid = workspace.WorkspaceId });
            if (change is null) return null;
            await EnrichAsync(conn, [change]);
            return change;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get change {changeId}", sql, ex);
            throw;
        }
    }

    public async Task<long> CreateAsync(CreateChangeRequest request)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            sql = "SELECT ChangeTypeId FROM lookup.ChangeType WHERE Code=@c";
            var typeId = await conn.ExecuteScalarAsync<byte>(sql, new { c = request.ChangeTypeCode });
            sql = "SELECT RiskId FROM lookup.Risk WHERE Code=@c";
            var riskId = await conn.ExecuteScalarAsync<byte>(sql, new { c = request.RiskCode });
            sql = "SELECT StateId FROM lookup.ChangeState WHERE Code='draft'";
            var stateId = await conn.ExecuteScalarAsync<byte>(sql);
            sql = "SELECT UserId FROM core.[User] WHERE ExternalId=@e";
            var ownerId = request.OwnerExtId is null ? (int?)null : await conn.ExecuteScalarAsync<int?>(sql, new { e = request.OwnerExtId });
            var approverId = request.ApproverExtId is null ? (int?)null : await conn.ExecuteScalarAsync<int?>(sql, new { e = request.ApproverExtId });
            sql = "SELECT GroupId FROM core.[Group] WHERE Slug=@s";
            var groupId = request.GroupSlug is null ? (int?)null : await conn.ExecuteScalarAsync<int?>(sql, new { s = request.GroupSlug });
            sql = "SELECT NEXT VALUE FOR itil.ChangeSeq";
            var newId = await conn.ExecuteScalarAsync<long>(sql);
            sql = """
                INSERT INTO itil.[Change] (ChangeId,Title,Description,RolloutPlan,RollbackPlan,ImpactNotes,
                    ChangeTypeId,RiskId,StateId,OwnerUserId,ApproverUserId,GroupId,
                    CabName,ScheduledStart,ScheduledEnd,DowntimeEstimate,WorkspaceId,CreatedAt,UpdatedAt)
                VALUES (@newId,@title,@desc,@rollout,@rollback,@impact,
                    @typeId,@riskId,@stateId,@ownerId,@approverId,@groupId,
                    @cab,@start,@end,@downtime,@wid,SYSUTCDATETIME(),SYSUTCDATETIME())
                """;
            var wid = workspace.WorkspaceId;
            await conn.ExecuteAsync(sql, new { newId, title = request.Title, desc = request.Description, rollout = request.RolloutPlan, rollback = request.RollbackPlan, impact = request.ImpactNotes, typeId, riskId, stateId, ownerId, approverId, groupId, cab = request.CabName, start = request.ScheduledStart, end = request.ScheduledEnd, downtime = request.DowntimeEstimate, wid });
            log.Info($"Created change {newId}: {request.Title}");
            return newId;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create change: {request.Title}", sql, ex);
            throw;
        }
    }

    public async Task UpdateAsync(long changeId, UpdateChangeRequest request)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            sql = "SELECT ChangeTypeId FROM lookup.ChangeType WHERE Code=@c";
            var typeId = await conn.ExecuteScalarAsync<byte>(sql, new { c = request.ChangeTypeCode });
            sql = "SELECT RiskId FROM lookup.Risk WHERE Code=@c";
            var riskId = await conn.ExecuteScalarAsync<byte>(sql, new { c = request.RiskCode });
            sql = "SELECT UserId FROM core.[User] WHERE ExternalId=@e";
            var ownerId = string.IsNullOrEmpty(request.OwnerExtId) ? (int?)null : await conn.ExecuteScalarAsync<int?>(sql, new { e = request.OwnerExtId });
            var approverId = string.IsNullOrEmpty(request.ApproverExtId) ? (int?)null : await conn.ExecuteScalarAsync<int?>(sql, new { e = request.ApproverExtId });
            sql = "SELECT GroupId FROM core.[Group] WHERE Slug=@s";
            var groupId = string.IsNullOrEmpty(request.GroupSlug) ? (int?)null : await conn.ExecuteScalarAsync<int?>(sql, new { s = request.GroupSlug });
            sql = """
                UPDATE itil.[Change] SET
                    Title=@title, Description=@desc, RolloutPlan=@rollout, RollbackPlan=@rollback, ImpactNotes=@impact,
                    ChangeTypeId=@typeId, RiskId=@riskId, OwnerUserId=@ownerId, ApproverUserId=@approverId, GroupId=@groupId,
                    CabName=@cab, ScheduledStart=@start, ScheduledEnd=@end, DowntimeEstimate=@downtime,
                    UpdatedAt=SYSUTCDATETIME()
                WHERE ChangeId=@changeId AND DeletedAt IS NULL
                """;
            await conn.ExecuteAsync(sql, new { changeId, title = request.Title, desc = request.Description, rollout = request.RolloutPlan, rollback = request.RollbackPlan, impact = request.ImpactNotes, typeId, riskId, ownerId, approverId, groupId, cab = request.CabName, start = request.ScheduledStart, end = request.ScheduledEnd, downtime = request.DowntimeEstimate });
            log.Info($"Updated change {changeId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update change {changeId}", sql, ex);
            throw;
        }
    }

    public async Task UpdateStateAsync(long changeId, string stateCode, int? actorUserId)
    {
        string sql = "SELECT StateId FROM lookup.ChangeState WHERE Code=@stateCode";
        try
        {
            using var conn = db.Create();
            var stateId = await conn.ExecuteScalarAsync<byte>(sql, new { stateCode });
            sql = "UPDATE itil.[Change] SET StateId=@stateId, CompletedAt=CASE WHEN @stateCode='complete' THEN SYSUTCDATETIME() ELSE CompletedAt END, UpdatedAt=SYSUTCDATETIME() WHERE ChangeId=@changeId";
            await conn.ExecuteAsync(sql, new { changeId, stateId, stateCode });
            log.Info($"Change {changeId} state changed to {stateCode}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update state on change {changeId}", sql, ex);
            throw;
        }
    }

    public async Task VoteAsync(long changeId, string userExtId, string voteCode, string? comment)
    {
        string sql = "itil.usp_VoteOnChange";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql,
                new { ChangeId = changeId, UserExtId = userExtId, VoteCode = voteCode, Comment = comment },
                commandType: System.Data.CommandType.StoredProcedure);
            log.Info($"Vote {voteCode} recorded on change {changeId} by {userExtId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to vote on change {changeId}", sql, ex);
            throw;
        }
    }

    private static async Task EnrichAsync(System.Data.IDbConnection conn, List<Change> changes)
    {
        if (changes.Count == 0) return;

        var reviewerSql = """
            SELECT cr.ChangeReviewerId, cr.ChangeId, cr.UserId,
                   u.DisplayName AS UserName, u.AvatarInitials AS UserInitials, u.AvatarColor AS UserColor,
                   cr.VoteId, av.Code AS VoteCode, cr.Comment, cr.VotedAt
            FROM itil.ChangeReviewer cr
            JOIN core.[User] u ON u.UserId = cr.UserId
            JOIN lookup.ApprovalVote av ON av.VoteId = cr.VoteId
            WHERE cr.ChangeId IN @ids
            """;
        var svcSql = "SELECT cs.ChangeId, s.Slug FROM itil.ChangeService cs JOIN core.Service s ON s.ServiceId=cs.ServiceId WHERE cs.ChangeId IN @ids";
        var ids = changes.Select(c => c.ChangeId).ToArray();
        var reviewers = (await conn.QueryAsync<ChangeReviewer>(reviewerSql, new { ids })).ToLookup(r => r.ChangeId);
        var svcs = (await conn.QueryAsync<(long ChangeId, string Slug)>(svcSql, new { ids })).ToLookup(x => x.ChangeId, x => x.Slug);

        foreach (var c in changes)
        {
            c.Reviewers = reviewers[c.ChangeId].ToList();
            c.AffectedServiceSlugs = svcs[c.ChangeId].ToList();
        }
    }
}
