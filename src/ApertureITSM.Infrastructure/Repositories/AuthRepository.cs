using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

public class AuthRepository(IDbConnectionFactory db) : IAuthRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(AuthRepository));

    private class CredentialRow
    {
        public int UserId { get; set; }
        public string PasswordHash { get; set; } = string.Empty;
    }

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
