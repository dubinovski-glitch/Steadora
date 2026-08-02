using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

/// <summary>
/// Read-only access to authentication/identity data: login credentials and the signed-in user's
/// profile (role plus assigned services) used to build the auth principal.
/// </summary>
public class AuthRepository(IDbConnectionFactory db) : IAuthRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(AuthRepository));

    // Internal shape for the credential lookup; not exposed to callers.
    private class CredentialRow
    {
        public int UserId { get; set; }
        public string PasswordHash { get; set; } = string.Empty;
    }

    /// <summary>
    /// Looks up the stored password hash for an active, password-enabled user so the caller can verify
    /// a login attempt. Returns null when no such user exists (caller treats this as auth failure).
    /// </summary>
    public async Task<(int UserId, string PasswordHash)?> GetCredentialsAsync(string username)
    {
        const string sql = """
            SELECT u.UserId, u.PasswordHash
            FROM core.[User] u
            WHERE u.Username = @username AND u.IsActive = 1 AND u.PasswordHash IS NOT NULL
            """;
        try
        {
            using var conn = db.Create();
            var row = await conn.QueryFirstOrDefaultAsync<CredentialRow>(sql, new { username });
            return row is null ? null : (row.UserId, row.PasswordHash);
        }
        catch (Exception ex)
        {
            log.Error($"Failed to get credentials for user '{username}'", ex);
            throw;
        }
    }

    /// <summary>
    /// Loads the full auth principal for an active user (profile + role), then attaches their assigned
    /// service ids in a second query. Returns null if the user is missing or inactive.
    /// </summary>
    public async Task<AuthUser?> GetUserByIdAsync(int userId)
    {
        const string userSql = """
            SELECT u.UserId, u.ExternalId, u.Username, u.Email, u.DisplayName,
                   u.AvatarInitials, u.AvatarColor,
                   r.Code AS RoleCode, r.DisplayName AS RoleDisplayName
            FROM core.[User] u
            JOIN lookup.Role r ON r.RoleId = u.RoleId
            WHERE u.UserId = @userId AND u.IsActive = 1
            """;
        const string servicesSql = "SELECT ServiceId FROM core.UserService WHERE UserId = @userId";
        try
        {
            using var conn = db.Create();
            var user = await conn.QueryFirstOrDefaultAsync<AuthUser>(userSql, new { userId });
            if (user is null) return null;
            // Second round-trip: list of services this user is scoped to (drives service-level access).
            user.ServiceIds = (await conn.QueryAsync<int>(servicesSql, new { userId })).ToArray();
            return user;
        }
        catch (Exception ex)
        {
            log.Error($"Failed to load auth user for userId {userId}", ex);
            throw;
        }
    }
}
