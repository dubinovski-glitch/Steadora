namespace ApertureITSM.Core.Models;

public class User
{
    public int UserId { get; init; }
    public string ExternalId { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Username { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string? Title { get; init; }
    public string? AvatarInitials { get; init; }
    public string? AvatarColor { get; init; }
    public byte RoleId { get; init; }
    public string RoleCode { get; init; } = string.Empty;
    public int? PrimaryGroupId { get; init; }
    public string? PrimaryGroupName { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public class Group
{
    public int GroupId { get; init; }
    public string Slug { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsActive { get; init; }
    public int MemberCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
