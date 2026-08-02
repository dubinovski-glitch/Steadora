namespace ApertureITSM.Core.Models;

/// <summary>
/// A person who can use the system, with their profile, role, and group memberships.
/// </summary>
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
    public string? GroupNames { get; init; } // comma-separated names of the groups the user belongs to
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

/// <summary>
/// A team or assignment group that users belong to and that work items can be assigned to.
/// </summary>
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
