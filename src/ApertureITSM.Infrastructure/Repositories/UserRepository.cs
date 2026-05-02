using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

public class UserRepository(IDbConnectionFactory db) : IUserRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(UserRepository));

    public async Task<IEnumerable<User>> GetAllAsync()
    {
        string sql = """
            SELECT u.UserId, u.ExternalId, u.Email, u.DisplayName, u.Title,
                   u.AvatarInitials, u.AvatarColor, u.RoleId, r.Code AS RoleCode,
                   u.PrimaryGroupId, g.Name AS PrimaryGroupName, u.IsActive, u.CreatedAt, u.UpdatedAt
            FROM core.[User] u
            LEFT JOIN lookup.Role  r ON r.RoleId  = u.RoleId
            LEFT JOIN core.[Group] g ON g.GroupId = u.PrimaryGroupId
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

    public async Task<User?> GetByExternalIdAsync(string externalId)
    {
        string sql = """
            SELECT u.UserId, u.ExternalId, u.Email, u.DisplayName, u.Title,
                   u.AvatarInitials, u.AvatarColor, u.RoleId, r.Code AS RoleCode,
                   u.PrimaryGroupId, g.Name AS PrimaryGroupName, u.IsActive, u.CreatedAt, u.UpdatedAt
            FROM core.[User] u
            LEFT JOIN lookup.Role  r ON r.RoleId  = u.RoleId
            LEFT JOIN core.[Group] g ON g.GroupId = u.PrimaryGroupId
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

    public async Task<IEnumerable<Group>> GetGroupsAsync()
    {
        string sql = "SELECT * FROM core.[Group] WHERE IsActive=1 ORDER BY Name";
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

    public async Task<IEnumerable<Service>> GetServicesAsync()
    {
        string sql = """
            SELECT s.ServiceId, s.Slug, s.Name, s.CategoryId, c.DisplayName AS CategoryName,
                   s.OwningGroupId, g.Name AS OwningGroupName, s.HealthId, h.Code AS HealthCode,
                   s.Description, s.IsActive,
                   (SELECT COUNT(*) FROM itil.Incident i JOIN lookup.IncidentStatus st ON st.StatusId=i.StatusId WHERE i.ServiceId=s.ServiceId AND st.IsTerminal=0 AND i.DeletedAt IS NULL) AS OpenIncidentCount
            FROM core.Service s
            LEFT JOIN lookup.Category      c ON c.CategoryId = s.CategoryId
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
