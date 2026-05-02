using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

public interface IUserRepository
{
    Task<IEnumerable<User>> GetAllAsync();
    Task<User?> GetByExternalIdAsync(string externalId);
    Task<IEnumerable<Group>> GetGroupsAsync();
    Task<IEnumerable<Service>> GetServicesAsync();
    Task<IEnumerable<ConfigurationItem>> GetConfigurationItemsAsync();
}
