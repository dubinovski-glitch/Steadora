using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

public interface IIncidentRepository
{
    Task<(IEnumerable<Incident> Items, int Total)> GetPagedAsync(IncidentFilter filter, int page, int pageSize);
    Task<Incident?> GetByIdAsync(long incidentId);
    Task<long> CreateAsync(CreateIncidentRequest request);
    Task UpdateStatusAsync(long incidentId, string statusCode, int? actorUserId);
    Task UpdateAssigneeAsync(long incidentId, string? assigneeExtId, int? actorUserId);
    Task UpdatePriorityAsync(long incidentId, string priorityCode, int? actorUserId);
    Task UpdateFieldAsync(long incidentId, string field, string? value, int? actorUserId);
    Task LinkToProblemAsync(long incidentId, long problemId, int? actorUserId);
    Task SoftDeleteAsync(long incidentId, int? actorUserId);
}

public class IncidentFilter
{
    public string? Search { get; init; }
    public string? StatusCode { get; init; }
    public string? PriorityCode { get; init; }
    public int? AssigneeUserId { get; init; }
    public int? GroupId { get; init; }
    public bool OnlySlaAtRisk { get; init; }
    public bool OnlyUnassigned { get; init; }
    public bool IncludeResolved { get; init; }
    public string SortBy { get; init; } = "UpdatedAt";
    public bool SortDesc { get; init; } = true;
}

public class CreateIncidentRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string PriorityCode { get; init; } = "medium";
    public string? CategoryCode { get; init; }
    public string? ServiceSlug { get; init; }
    public string? CiAssetTag { get; init; }
    public string? ReporterExtId { get; init; }
    public string? ReporterDisplay { get; init; }
    public string? AssigneeExtId { get; init; }
    public string? GroupSlug { get; init; }
    public string? ImpactCode { get; init; }
    public string? UrgencyCode { get; init; }
    public string? CreatedByExtId { get; init; }
}
