using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using log4net;

namespace ApertureITSM.Features.Notifications;

public interface INotificationService
{
    Task<IEnumerable<Notification>> GetUnreadAsync(int userId);
    Task MarkAllReadAsync(int userId);
    Task<IEnumerable<ActivityEvent>> GetTimelineAsync(string parentType, long parentId);
    Task<IEnumerable<Comment>> GetCommentsAsync(string parentType, long parentId);
    Task<long> PostCommentAsync(string parentType, long parentId, string authorExtId, string body, bool isInternal);
    Task<IEnumerable<Watcher>> GetWatchersAsync(string parentType, long parentId);
    Task WatchAsync(string parentType, long parentId, int userId);
    Task UnwatchAsync(string parentType, long parentId, int userId);
}

public class NotificationService(IActivityRepository repository) : INotificationService
{
    private static readonly ILog log = LogManager.GetLogger(typeof(NotificationService));

    public Task<IEnumerable<Notification>> GetUnreadAsync(int userId)
        => repository.GetUnreadNotificationsAsync(userId);

    public Task MarkAllReadAsync(int userId)
        => repository.MarkNotificationsReadAsync(userId);

    public Task<IEnumerable<ActivityEvent>> GetTimelineAsync(string parentType, long parentId)
        => repository.GetByParentAsync(parentType, parentId);

    public Task<IEnumerable<Comment>> GetCommentsAsync(string parentType, long parentId)
        => repository.GetCommentsByParentAsync(parentType, parentId);

    public Task<long> PostCommentAsync(string parentType, long parentId, string authorExtId, string body, bool isInternal)
    {
        log.Info($"Comment posted on {parentType}/{parentId} by {authorExtId}");
        return repository.AddCommentAsync(parentType, parentId, authorExtId, body, isInternal);
    }

    public Task<IEnumerable<Watcher>> GetWatchersAsync(string parentType, long parentId)
        => repository.GetWatchersAsync(parentType, parentId);

    public Task WatchAsync(string parentType, long parentId, int userId)
        => repository.AddWatcherAsync(parentType, parentId, userId);

    public Task UnwatchAsync(string parentType, long parentId, int userId)
        => repository.RemoveWatcherAsync(parentType, parentId, userId);
}
