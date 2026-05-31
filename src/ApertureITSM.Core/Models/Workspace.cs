namespace ApertureITSM.Core.Models;

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
    public List<int> UserIds { get; set; } = [];
}

public class WorkspaceField
{
    public int WorkspaceFieldId { get; set; }
    public int WorkspaceId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public string FieldKey { get; set; } = string.Empty;
    public bool IsVisible { get; set; }
    public bool IsMandatory { get; set; }
}
