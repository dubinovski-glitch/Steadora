namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Exposes the workspace (tenant) that applies to the current request, used to scope data access.
/// </summary>
public interface IWorkspaceContext
{
    /// <summary>Gets the identifier of the workspace in scope for the current request.</summary>
    int WorkspaceId { get; }
}
