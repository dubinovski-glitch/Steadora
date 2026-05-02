namespace ApertureITSM.Core.Models;

public class Comment
{
    public long CommentId { get; init; }
    public string ParentType { get; init; } = string.Empty;
    public long ParentId { get; init; }
    public int? AuthorUserId { get; init; }
    public string? AuthorName { get; init; }
    public string? AuthorInitials { get; init; }
    public string? AuthorColor { get; init; }
    public string? AuthorDisplay { get; init; }
    public string Body { get; init; } = string.Empty;
    public bool Internal { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? EditedAt { get; init; }
}

public class ActivityEvent
{
    public long ActivityId { get; init; }
    public string ParentType { get; init; } = string.Empty;
    public long ParentId { get; init; }
    public int? ActorUserId { get; init; }
    public string? ActorName { get; init; }
    public string? ActorInitials { get; init; }
    public string? ActorColor { get; init; }
    public string Kind { get; init; } = string.Empty;
    public string? Field { get; init; }
    public string? OldValue { get; init; }
    public string? NewValue { get; init; }
    public string? DataJson { get; init; }
    public DateTime OccurredAt { get; init; }
}

public class Notification
{
    public long NotificationId { get; init; }
    public int UserId { get; init; }
    public string ParentType { get; init; } = string.Empty;
    public long ParentId { get; init; }
    public string Kind { get; init; } = string.Empty;
    public string? Message { get; init; }
    public DateTime? ReadAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public bool IsRead => ReadAt.HasValue;
}

public class Watcher
{
    public string ParentType { get; init; } = string.Empty;
    public long ParentId { get; init; }
    public int UserId { get; init; }
    public string UserName { get; init; } = string.Empty;
    public string? UserInitials { get; init; }
    public string? UserColor { get; init; }
    public DateTime CreatedAt { get; init; }
}
