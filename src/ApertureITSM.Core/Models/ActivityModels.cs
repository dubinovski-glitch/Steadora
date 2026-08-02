namespace ApertureITSM.Core.Models;

/// <summary>
/// A user-authored comment attached to a parent record (e.g. incident, problem, change),
/// identified by <see cref="ParentType"/> and <see cref="ParentId"/>. Comments may be marked
/// <see cref="Internal"/> to hide them from end users.
/// </summary>
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

/// <summary>
/// An audit/timeline entry recording something that happened on a parent record, such as a
/// field change or state transition. <see cref="Kind"/> classifies the event; for field changes
/// <see cref="Field"/>, <see cref="OldValue"/> and <see cref="NewValue"/> capture the before/after.
/// </summary>
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

/// <summary>
/// An in-app notification delivered to a single user about activity on a parent record.
/// </summary>
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
    public bool IsRead => ReadAt.HasValue; // derived: read once ReadAt is set
}

/// <summary>
/// A subscription linking a user to a parent record so they receive notifications about its
/// activity. The parent is identified by <see cref="ParentType"/> and <see cref="ParentId"/>.
/// </summary>
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
