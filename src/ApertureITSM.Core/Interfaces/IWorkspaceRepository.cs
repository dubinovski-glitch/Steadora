using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Provides data access for workspaces (multi-tenant data isolation boundaries),
/// including their field configuration and user membership.
/// </summary>
public interface IWorkspaceRepository
{
    /// <summary>Gets all workspaces.</summary>
    Task<IEnumerable<Workspace>> GetAllAsync();
    /// <summary>Gets a single workspace by its identifier, or null if not found.</summary>
    Task<Workspace?> GetByIdAsync(int workspaceId);
    /// <summary>Gets the workspaces a user is a member of.</summary>
    Task<IEnumerable<Workspace>> GetForUserAsync(int userId);
    /// <summary>Creates a new workspace and returns its identifier.</summary>
    Task<int> CreateAsync(CreateWorkspaceRequest request);
    /// <summary>Updates an existing workspace's details.</summary>
    Task UpdateAsync(int workspaceId, UpdateWorkspaceRequest request);
    /// <summary>Replaces the per-entity field visibility/mandatory configuration for a workspace.</summary>
    Task SetFieldsAsync(int workspaceId, IEnumerable<SetWorkspaceFieldRequest> fields);
    /// <summary>Replaces the set of users that are members of a workspace.</summary>
    Task SetUsersAsync(int workspaceId, IEnumerable<int> userIds);
    /// <summary>Deletes a workspace.</summary>
    Task DeleteAsync(int workspaceId);
}

/// <summary>Data required to create a new workspace.</summary>
public class CreateWorkspaceRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
}

/// <summary>Data used to update an existing workspace's details.</summary>
public class UpdateWorkspaceRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsActive { get; init; }
}

/// <summary>Visibility and mandatory configuration for a single field of an entity within a workspace.</summary>
public class SetWorkspaceFieldRequest
{
    public string EntityType { get; init; } = string.Empty;
    public string FieldKey { get; init; } = string.Empty;
    public bool IsVisible { get; init; }
    public bool IsMandatory { get; init; }
}
