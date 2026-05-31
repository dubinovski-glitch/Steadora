using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

public interface IWorkspaceRepository
{
    Task<IEnumerable<Workspace>> GetAllAsync();
    Task<Workspace?> GetByIdAsync(int workspaceId);
    Task<IEnumerable<Workspace>> GetForUserAsync(int userId);
    Task<int> CreateAsync(CreateWorkspaceRequest request);
    Task UpdateAsync(int workspaceId, UpdateWorkspaceRequest request);
    Task SetFieldsAsync(int workspaceId, IEnumerable<SetWorkspaceFieldRequest> fields);
    Task SetUsersAsync(int workspaceId, IEnumerable<int> userIds);
    Task DeleteAsync(int workspaceId);
}

public class CreateWorkspaceRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
}

public class UpdateWorkspaceRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsActive { get; init; }
}

public class SetWorkspaceFieldRequest
{
    public string EntityType { get; init; } = string.Empty;
    public string FieldKey { get; init; } = string.Empty;
    public bool IsVisible { get; init; }
    public bool IsMandatory { get; init; }
}
