using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Provides authentication-related data access, such as retrieving stored credentials
/// and authenticated user details.
/// </summary>
public interface IAuthRepository
{
    /// <summary>Gets the user id and stored password hash for a username, or null if not found.</summary>
    Task<(int UserId, string PasswordHash)?> GetCredentialsAsync(string username);
    /// <summary>Gets the authenticated user profile for the given user id, or null if not found.</summary>
    Task<AuthUser?> GetUserByIdAsync(int userId);
}
