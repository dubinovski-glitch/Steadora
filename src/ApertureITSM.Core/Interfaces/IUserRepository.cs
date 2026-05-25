using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

public interface IUserRepository
{
    Task<IEnumerable<User>> GetAllAsync();
    Task<IEnumerable<User>> GetByGroupSlugAsync(string groupSlug);
    Task<User?> GetByExternalIdAsync(string externalId);
    Task<IEnumerable<Group>> GetGroupsAsync();
    Task<int[]> GetGroupIdsAsync(int userId);
    Task<IEnumerable<Service>> GetServicesAsync();
    Task<IEnumerable<ConfigurationItem>> GetConfigurationItemsAsync();
}
