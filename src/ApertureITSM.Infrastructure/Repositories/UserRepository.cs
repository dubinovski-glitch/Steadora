using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

/// <summary>
/// Read-only directory data used to populate pickers and reference lists across the app: users,
/// their group memberships, groups, services, and configuration items (CIs).
/// </summary>
public class UserRepository(IDbConnectionFactory db) : IUserRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(UserRepository));

    /// <summary>Returns all active users (with role code) ordered by display name, e.g. for assignee pickers.</summary>
    public async Task<IEnumerable<User>> GetAllAsync()
    {
        string sql = """
            SELECT u.UserId, u.ExternalId, u.Email, u.DisplayName, u.Title,
                   u.AvatarInitials, u.AvatarColor, u.RoleId, r.Code AS RoleCode,
                   u.IsActive, u.CreatedAt, u.UpdatedAt
            FROM core.[User] u
            LEFT JOIN lookup.Role r ON r.RoleId = u.RoleId
            WHERE u.IsActive = 1 ORDER BY u.DisplayName
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<User>(sql);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get users", sql, ex);
            throw;
        }
    }

    /// <summary>Returns the active members of a single group (identified by slug), for group-scoped pickers.</summary>
    public async Task<IEnumerable<User>> GetByGroupSlugAsync(string groupSlug)
    {
        string sql = """
            SELECT u.UserId, u.ExternalId, u.Email, u.DisplayName, u.Title,
                   u.AvatarInitials, u.AvatarColor, u.RoleId, r.Code AS RoleCode,
                   u.IsActive, u.CreatedAt, u.UpdatedAt
            FROM core.[User] u
            JOIN core.UserGroup ug ON ug.UserId  = u.UserId
            JOIN core.[Group]   g  ON g.GroupId  = ug.GroupId
            LEFT JOIN lookup.Role r ON r.RoleId  = u.RoleId
            WHERE g.Slug = @groupSlug AND u.IsActive = 1
            ORDER BY u.DisplayName
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<User>(sql, new { groupSlug });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get users for group '{groupSlug}'", sql, ex);
            throw;
        }
    }

    /// <summary>Resolves a single user by their stable external id (the identifier used in API requests).</summary>
    public async Task<User?> GetByExternalIdAsync(string externalId)
    {
        string sql = """
            SELECT u.UserId, u.ExternalId, u.Email, u.DisplayName, u.Title,
                   u.AvatarInitials, u.AvatarColor, u.RoleId, r.Code AS RoleCode,
                   u.IsActive, u.CreatedAt, u.UpdatedAt
            FROM core.[User] u
            LEFT JOIN lookup.Role r ON r.RoleId = u.RoleId
            WHERE u.ExternalId = @externalId
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryFirstOrDefaultAsync<User>(sql, new { externalId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get user by external id '{externalId}'", sql, ex);
            throw;
        }
    }

    /// <summary>Returns the ids of the groups a user belongs to, used to scope "my group" queue filters.</summary>
    public async Task<int[]> GetGroupIdsAsync(int userId)
    {
        const string sql = "SELECT GroupId FROM core.UserGroup WHERE UserId = @userId";
        try
        {
            using var conn = db.Create();
            var ids = await conn.QueryAsync<int>(sql, new { userId });
            return ids.ToArray();
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get group ids for user {userId}", sql, ex);
            throw;
        }
    }

    /// <summary>Returns active groups each with a computed count of active members, for group lists/pickers.</summary>
    public async Task<IEnumerable<Group>> GetGroupsAsync()
    {
        string sql = """
            SELECT g.GroupId, g.Slug, g.Name, g.Description, g.IsActive,
                   g.CreatedAt, g.UpdatedAt,
                   COUNT(u.UserId) AS MemberCount
            FROM core.[Group] g
            LEFT JOIN core.UserGroup ug ON ug.GroupId = g.GroupId
            LEFT JOIN core.[User]    u  ON u.UserId   = ug.UserId AND u.IsActive = 1
            WHERE g.IsActive = 1
            GROUP BY g.GroupId, g.Slug, g.Name, g.Description, g.IsActive, g.CreatedAt, g.UpdatedAt
            ORDER BY g.Name
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<Group>(sql);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get groups", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Returns active services with owning group and health, plus a computed OpenIncidentCount per service
    /// (the correlated subquery counts non-terminal, non-deleted incidents).
    /// </summary>
    public async Task<IEnumerable<Service>> GetServicesAsync()
    {
        string sql = """
            SELECT s.ServiceId, s.Slug, s.Name,
                   s.OwningGroupId, g.Name AS OwningGroupName, s.HealthId, h.Code AS HealthCode,
                   s.Description, s.IsActive,
                   (SELECT COUNT(*) FROM itil.Incident i JOIN lookup.IncidentStatus st ON st.StatusId=i.StatusId WHERE i.ServiceId=s.ServiceId AND st.IsTerminal=0 AND i.DeletedAt IS NULL) AS OpenIncidentCount
            FROM core.Service s
            LEFT JOIN core.[Group]         g ON g.GroupId    = s.OwningGroupId
            LEFT JOIN lookup.ServiceHealth h ON h.HealthId   = s.HealthId
            WHERE s.IsActive=1 ORDER BY s.Name
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<Service>(sql);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get services", sql, ex);
            throw;
        }
    }

    /// <summary>Returns active configuration items (CIs) with owner display name, for CI reference pickers.</summary>
    public async Task<IEnumerable<ConfigurationItem>> GetConfigurationItemsAsync()
    {
        string sql = """
            SELECT ci.CiId, ci.AssetTag, ci.Name, ci.Type, ci.Environment, ci.Region,
                   ci.OwnerUserId, u.DisplayName AS OwnerName, ci.IsActive
            FROM core.ConfigurationItem ci
            LEFT JOIN core.[User] u ON u.UserId = ci.OwnerUserId
            WHERE ci.IsActive=1 ORDER BY ci.Name
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<ConfigurationItem>(sql);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get configuration items", sql, ex);
            throw;
        }
    }
}
