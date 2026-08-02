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

/// <summary>
/// Handles cross-entity collaboration and notification concerns: per-user notification
/// inboxes, activity timelines, comments, and watcher subscriptions. Records are addressed
/// generically by a (parentType, parentId) pair so the same logic serves incidents,
/// problems, changes, etc. All persistence is delegated to <see cref="IActivityRepository"/>.
/// </summary>
public class NotificationService(IActivityRepository repository) : INotificationService
{
    private static readonly ILog log = LogManager.GetLogger(typeof(NotificationService));

    /// <summary>Returns the unread notifications belonging to the given user.</summary>
    public Task<IEnumerable<Notification>> GetUnreadAsync(int userId)
        => repository.GetUnreadNotificationsAsync(userId);

    /// <summary>Marks every notification for the given user as read, clearing their unread badge.</summary>
    public Task MarkAllReadAsync(int userId)
        => repository.MarkNotificationsReadAsync(userId);

    /// <summary>
    /// Returns the chronological activity/audit timeline for a parent entity, identified
    /// by its type discriminator (<paramref name="parentType"/>) and id.
    /// </summary>
    public Task<IEnumerable<ActivityEvent>> GetTimelineAsync(string parentType, long parentId)
        => repository.GetByParentAsync(parentType, parentId);

    /// <summary>Returns the comments attached to a parent entity, addressed by type and id.</summary>
    public Task<IEnumerable<Comment>> GetCommentsAsync(string parentType, long parentId)
        => repository.GetCommentsByParentAsync(parentType, parentId);

    /// <summary>
    /// Posts a new comment against a parent entity and returns its generated id.
    /// Business rule: <paramref name="isInternal"/> flags the comment as a private/internal
    /// note (visible only to agents) versus a public reply, and the author is captured by
    /// external id for audit. The action is logged.
    /// </summary>
    public Task<long> PostCommentAsync(string parentType, long parentId, string authorExtId, string body, bool isInternal)
    {
        log.Info($"Comment posted on {parentType}/{parentId} by {authorExtId}");
        return repository.AddCommentAsync(parentType, parentId, authorExtId, body, isInternal);
    }

    /// <summary>Returns the users watching (subscribed to) a parent entity.</summary>
    public Task<IEnumerable<Watcher>> GetWatchersAsync(string parentType, long parentId)
        => repository.GetWatchersAsync(parentType, parentId);

    /// <summary>
    /// Subscribes a user as a watcher of a parent entity so they receive its notifications.
    /// </summary>
    public Task WatchAsync(string parentType, long parentId, int userId)
        => repository.AddWatcherAsync(parentType, parentId, userId);

    /// <summary>Removes a user's watcher subscription from a parent entity.</summary>
    public Task UnwatchAsync(string parentType, long parentId, int userId)
        => repository.RemoveWatcherAsync(parentType, parentId, userId);
}
