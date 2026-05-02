using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

public interface IActivityRepository
{
    Task<IEnumerable<ActivityEvent>> GetByParentAsync(string parentType, long parentId);
    Task<IEnumerable<Comment>> GetCommentsByParentAsync(string parentType, long parentId);
    Task<long> AddCommentAsync(string parentType, long parentId, string authorExtId, string body, bool isInternal);
    Task<IEnumerable<Watcher>> GetWatchersAsync(string parentType, long parentId);
    Task AddWatcherAsync(string parentType, long parentId, int userId);
    Task RemoveWatcherAsync(string parentType, long parentId, int userId);
    Task<IEnumerable<Notification>> GetUnreadNotificationsAsync(int userId);
    Task MarkNotificationsReadAsync(int userId);
}
