using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Provides access to activity-related data (timeline events, comments, watchers and
/// notifications) for ITSM records such as incidents, problems and changes.
/// </summary>
public interface IActivityRepository
{
    /// <summary>Gets the chronological activity/timeline events for a given parent record.</summary>
    Task<IEnumerable<ActivityEvent>> GetByParentAsync(string parentType, long parentId);
    /// <summary>Gets the comments attached to a given parent record.</summary>
    Task<IEnumerable<Comment>> GetCommentsByParentAsync(string parentType, long parentId);
    /// <summary>Adds a comment to a parent record and returns the new comment's identifier.</summary>
    Task<long> AddCommentAsync(string parentType, long parentId, string authorExtId, string body, bool isInternal);
    /// <summary>Gets the users watching a given parent record.</summary>
    Task<IEnumerable<Watcher>> GetWatchersAsync(string parentType, long parentId);
    /// <summary>Adds a user as a watcher of a parent record.</summary>
    Task AddWatcherAsync(string parentType, long parentId, int userId);
    /// <summary>Removes a user from the watchers of a parent record.</summary>
    Task RemoveWatcherAsync(string parentType, long parentId, int userId);
    /// <summary>Gets the unread notifications for a user.</summary>
    Task<IEnumerable<Notification>> GetUnreadNotificationsAsync(int userId);
    /// <summary>Marks all of a user's notifications as read.</summary>
    Task MarkNotificationsReadAsync(int userId);
}
