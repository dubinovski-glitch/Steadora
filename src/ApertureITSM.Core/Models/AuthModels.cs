namespace ApertureITSM.Core.Models;

public class AuthUser
{
    public int UserId { get; set; }
    public string ExternalId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarInitials { get; set; }
    public string? AvatarColor { get; set; }
    public string RoleCode { get; set; } = string.Empty;
    public string RoleDisplayName { get; set; } = string.Empty;
    public int[] ServiceIds { get; set; } = [];
}
