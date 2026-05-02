using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

public class ActivityRepository(IDbConnectionFactory db) : IActivityRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(ActivityRepository));

    public async Task<IEnumerable<ActivityEvent>> GetByParentAsync(string parentType, long parentId)
    {
        string sql = """
            SELECT ae.ActivityId, ae.ParentType, ae.ParentId,
                   ae.ActorUserId, u.DisplayName AS ActorName, u.AvatarInitials AS ActorInitials, u.AvatarColor AS ActorColor,
                   ae.Kind, ae.Field, ae.OldValue, ae.NewValue, ae.DataJson, ae.OccurredAt
            FROM audit.ActivityEvent ae
            LEFT JOIN core.[User] u ON u.UserId = ae.ActorUserId
            WHERE ae.ParentType=@parentType AND ae.ParentId=@parentId
            ORDER BY ae.OccurredAt DESC
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<ActivityEvent>(sql, new { parentType, parentId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get activity events for {parentType}/{parentId}", sql, ex);
            throw;
        }
    }

    public async Task<IEnumerable<Comment>> GetCommentsByParentAsync(string parentType, long parentId)
    {
        string sql = """
            SELECT c.CommentId, c.ParentType, c.ParentId,
                   c.AuthorUserId, u.DisplayName AS AuthorName, u.AvatarInitials AS AuthorInitials, u.AvatarColor AS AuthorColor,
                   c.AuthorDisplay, c.Body, c.Internal, c.CreatedAt, c.EditedAt
            FROM audit.Comment c
            LEFT JOIN core.[User] u ON u.UserId = c.AuthorUserId
            WHERE c.ParentType=@parentType AND c.ParentId=@parentId AND c.DeletedAt IS NULL
            ORDER BY c.CreatedAt ASC
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<Comment>(sql, new { parentType, parentId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get comments for {parentType}/{parentId}", sql, ex);
            throw;
        }
    }

    public async Task<long> AddCommentAsync(string parentType, long parentId, string authorExtId, string body, bool isInternal)
    {
        string sql = "itil.usp_AddComment";
        try
        {
            using var conn = db.Create();
            var p = new DynamicParameters();
            p.Add("@ParentType", parentType);
            p.Add("@ParentId", parentId);
            p.Add("@AuthorExtId", authorExtId);
            p.Add("@Body", body);
            p.Add("@Internal", isInternal);
            await conn.ExecuteAsync(sql, p, commandType: System.Data.CommandType.StoredProcedure);
            sql = "SELECT TOP 1 CommentId FROM audit.Comment WHERE ParentType=@parentType AND ParentId=@parentId ORDER BY CreatedAt DESC";
            var id = await conn.ExecuteScalarAsync<long>(sql, new { parentType, parentId });
            log.Info($"Comment added to {parentType}/{parentId}");
            return id;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to add comment to {parentType}/{parentId}", sql, ex);
            throw;
        }
    }

    public async Task<IEnumerable<Watcher>> GetWatchersAsync(string parentType, long parentId)
    {
        string sql = """
            SELECT w.ParentType, w.ParentId, w.UserId,
                   u.DisplayName AS UserName, u.AvatarInitials AS UserInitials, u.AvatarColor AS UserColor,
                   w.CreatedAt
            FROM audit.Watcher w JOIN core.[User] u ON u.UserId=w.UserId
            WHERE w.ParentType=@parentType AND w.ParentId=@parentId
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<Watcher>(sql, new { parentType, parentId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get watchers for {parentType}/{parentId}", sql, ex);
            throw;
        }
    }

    public async Task AddWatcherAsync(string parentType, long parentId, int userId)
    {
        string sql = "IF NOT EXISTS (SELECT 1 FROM audit.Watcher WHERE ParentType=@parentType AND ParentId=@parentId AND UserId=@userId) INSERT INTO audit.Watcher (ParentType,ParentId,UserId) VALUES (@parentType,@parentId,@userId)";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { parentType, parentId, userId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to add watcher {userId} to {parentType}/{parentId}", sql, ex);
            throw;
        }
    }

    public async Task RemoveWatcherAsync(string parentType, long parentId, int userId)
    {
        string sql = "DELETE FROM audit.Watcher WHERE ParentType=@parentType AND ParentId=@parentId AND UserId=@userId";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { parentType, parentId, userId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to remove watcher {userId} from {parentType}/{parentId}", sql, ex);
            throw;
        }
    }

    public async Task<IEnumerable<Notification>> GetUnreadNotificationsAsync(int userId)
    {
        string sql = "SELECT * FROM audit.Notification WHERE UserId=@userId AND ReadAt IS NULL ORDER BY CreatedAt DESC";
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<Notification>(sql, new { userId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get unread notifications for user {userId}", sql, ex);
            throw;
        }
    }

    public async Task MarkNotificationsReadAsync(int userId)
    {
        string sql = "UPDATE audit.Notification SET ReadAt=SYSUTCDATETIME() WHERE UserId=@userId AND ReadAt IS NULL";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { userId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to mark notifications read for user {userId}", sql, ex);
            throw;
        }
    }
}
