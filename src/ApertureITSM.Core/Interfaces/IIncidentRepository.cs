using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Provides data access for incident records, including querying, creation, updates and
/// state transitions.
/// </summary>
public interface IIncidentRepository
{
    /// <summary>Gets a paged, filtered list of incidents along with the total matching count.</summary>
    Task<(IEnumerable<Incident> Items, int Total)> GetPagedAsync(IncidentFilter filter, int page, int pageSize);
    /// <summary>Gets a single incident by its identifier, or null if not found.</summary>
    Task<Incident?> GetByIdAsync(long incidentId);
    /// <summary>Creates a new incident and returns its identifier.</summary>
    Task<long> CreateAsync(CreateIncidentRequest request);
    /// <summary>Updates the editable fields of an existing incident.</summary>
    Task UpdateAsync(long incidentId, UpdateIncidentRequest request);
    /// <summary>Changes an incident's status, recording the acting user.</summary>
    Task UpdateStatusAsync(long incidentId, string statusCode, int? actorUserId);
    /// <summary>Reassigns an incident to a different assignee, recording the acting user.</summary>
    Task UpdateAssigneeAsync(long incidentId, string? assigneeExtId, int? actorUserId);
    /// <summary>Changes an incident's priority, recording the acting user.</summary>
    Task UpdatePriorityAsync(long incidentId, string priorityCode, int? actorUserId);
    /// <summary>Updates a single named field on an incident, recording the acting user.</summary>
    Task UpdateFieldAsync(long incidentId, string field, string? value, int? actorUserId);
    /// <summary>Links an incident to a problem, recording the acting user.</summary>
    Task LinkToProblemAsync(long incidentId, long problemId, int? actorUserId);
    /// <summary>Gets all incidents linked to the given problem.</summary>
    Task<IEnumerable<Incident>> GetByProblemIdAsync(long problemId);
    /// <summary>Soft-deletes an incident, recording the acting user.</summary>
    Task SoftDeleteAsync(long incidentId, int? actorUserId);
}

/// <summary>Filter and sort criteria for querying incidents.</summary>
public class IncidentFilter
{
    public string? Search { get; init; }
    public string? StatusCode { get; init; }
    public string? PriorityCode { get; init; }
    public int? AssigneeUserId { get; init; }
    public int? GroupId { get; init; }
    public int[]? GroupIds { get; init; }
    public bool OnlySlaAtRisk { get; init; }
    public bool OnlyUnassigned { get; init; }
    public bool IncludeResolved { get; init; }
    public int[]? ServiceIds { get; init; }
    public string SortBy { get; init; } = "UpdatedAt";
    public bool SortDesc { get; init; } = true;
}

/// <summary>Data required to create a new incident.</summary>
public class CreateIncidentRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string PriorityCode { get; init; } = "medium";

    // Classification
    public string? ServiceSlug { get; init; }
    public string? CategoryCode { get; init; }
    public string? SubCategoryCode { get; init; }
    public string? CiAssetTag { get; init; }

    // Identification / Reporter
    public string? ReporterExtId { get; init; }
    public string? ReporterDisplay { get; init; }
    public string? CallerExtId { get; init; }
    public string? ContactMethodCode { get; init; }
    public string? Location { get; init; }

    // Assignment
    public string? AssigneeExtId { get; init; }
    public string? GroupSlug { get; init; }

    // Prioritization
    public string? ImpactCode { get; init; }
    public string? UrgencyCode { get; init; }
    public string? SeverityCode { get; init; }
    public bool IsMajorIncident { get; init; }

    // Resolution (pre-filled at creation, required at closure)
    public string? ResolutionCodeCode { get; init; }
    public string? ResolutionNotes { get; init; }

    public string? CreatedByExtId { get; init; }
}

/// <summary>Data used to update the editable fields of an existing incident.</summary>
public class UpdateIncidentRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? CallerExtId { get; init; }
    public string? ContactMethodCode { get; init; }
    public string? Location { get; init; }
    public string? ServiceSlug { get; init; }
    public string? CategoryCode { get; init; }
    public string? SubCategoryCode { get; init; }
    public string? CiAssetTag { get; init; }
    public string PriorityCode { get; init; } = "medium";
    public string? ImpactCode { get; init; }
    public string? UrgencyCode { get; init; }
    public string? SeverityCode { get; init; }
    public bool IsMajorIncident { get; init; }
    public string? GroupSlug { get; init; }
    public string? AssigneeExtId { get; init; }
    public string? ResolutionCodeCode { get; init; }
    public string? ResolutionNotes { get; init; }
    public string? ActorExtId { get; init; }
}
