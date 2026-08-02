namespace ApertureITSM.Core.Models;

/// <summary>
/// A tenant/data-isolation boundary that scopes records and configuration. Carries its member
/// users and per-entity field configuration, with one workspace flagged as the default.
/// </summary>
public class Workspace
{
    public int WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<WorkspaceField> Fields { get; set; } = [];
    public List<int> UserIds { get; set; } = []; // members assigned to this workspace
}

/// <summary>
/// Per-workspace configuration controlling a single field on a given entity type, including
/// whether it is shown in the UI and whether it is required.
/// </summary>
public class WorkspaceField
{
    public int WorkspaceFieldId { get; set; }
    public int WorkspaceId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public string FieldKey { get; set; } = string.Empty;
    public bool IsVisible { get; set; }
    public bool IsMandatory { get; set; }
}
