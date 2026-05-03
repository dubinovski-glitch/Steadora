namespace ApertureITSM.Core.Models;

public class Service
{
    public int ServiceId { get; init; }
    public string Slug { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int? OwningGroupId { get; init; }
    public string? OwningGroupName { get; init; }
    public byte HealthId { get; init; }
    public string HealthCode { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int? SlaTierId { get; init; }
    public string? SlaTierName { get; init; }
    public bool IsActive { get; init; }
    public int OpenIncidentCount { get; init; }
}

public class ConfigurationItem
{
    public int CiId { get; init; }
    public string AssetTag { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string? Environment { get; init; }
    public string? Region { get; init; }
    public int? OwnerUserId { get; init; }
    public string? OwnerName { get; init; }
    public bool IsActive { get; init; }
}
