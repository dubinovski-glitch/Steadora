using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Provides read access to users and related organizational data (groups, services and
/// configuration items).
/// </summary>
public interface IUserRepository
{
    /// <summary>Gets all users.</summary>
    Task<IEnumerable<User>> GetAllAsync();
    /// <summary>Gets the users belonging to the group identified by its slug.</summary>
    Task<IEnumerable<User>> GetByGroupSlugAsync(string groupSlug);
    /// <summary>Gets a single user by external identifier, or null if not found.</summary>
    Task<User?> GetByExternalIdAsync(string externalId);
    /// <summary>Gets all groups.</summary>
    Task<IEnumerable<Group>> GetGroupsAsync();
    /// <summary>Gets the identifiers of the groups a user belongs to.</summary>
    Task<int[]> GetGroupIdsAsync(int userId);
    /// <summary>Gets all services.</summary>
    Task<IEnumerable<Service>> GetServicesAsync();
    /// <summary>Gets all configuration items (CIs).</summary>
    Task<IEnumerable<ConfigurationItem>> GetConfigurationItemsAsync();
}
