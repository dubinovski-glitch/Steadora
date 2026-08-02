using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using log4net;

namespace ApertureITSM.Features.Incidents;

public interface IIncidentService
{
    Task<(IEnumerable<Incident> Items, int Total)> GetQueueAsync(IncidentFilter filter, int page, int pageSize);
    Task<Incident?> GetDetailAsync(long incidentId);
    Task<long> CreateAsync(CreateIncidentRequest request);
    Task UpdateAsync(long incidentId, UpdateIncidentRequest request);
    Task SetStatusAsync(long incidentId, string statusCode, int? actorUserId);
    Task AssignAsync(long incidentId, string? assigneeExtId, int? actorUserId);
    Task SetPriorityAsync(long incidentId, string priorityCode, int? actorUserId);
    Task LinkToProblemAsync(long incidentId, long problemId, int? actorUserId);
    Task<IEnumerable<Incident>> GetByProblemIdAsync(long problemId);
    Task CloseAsync(long incidentId, int? actorUserId);
    Task BulkCloseAsync(IEnumerable<long> incidentIds, int? actorUserId);
}

/// <summary>
/// Core application service for incident management. Provides the agent work queue plus the
/// full incident lifecycle: creation, edits, status/priority/assignment changes, linking
/// incidents to a parent problem, and (single and bulk) closure. All operations delegate
/// persistence to <see cref="IIncidentRepository"/> and attribute lifecycle changes to an
/// acting user for the audit trail.
/// </summary>
public class IncidentService(IIncidentRepository repository) : IIncidentService
{
    private static readonly ILog log = LogManager.GetLogger(typeof(IncidentService));

    /// <summary>
    /// Returns one page of the incident queue plus the total matching count. The supplied
    /// <see cref="IncidentFilter"/> drives filtering/scoping (e.g. status, assignment group),
    /// and the result is paged by <paramref name="page"/>/<paramref name="pageSize"/>.
    /// </summary>
    public Task<(IEnumerable<Incident> Items, int Total)> GetQueueAsync(IncidentFilter filter, int page, int pageSize)
        => repository.GetPagedAsync(filter, page, pageSize);

    /// <summary>Returns the full detail of a single incident, or null if not found.</summary>
    public Task<Incident?> GetDetailAsync(long incidentId)
        => repository.GetByIdAsync(incidentId);

    /// <summary>
    /// Creates a new incident and returns its generated id (assigned by the repository/database).
    /// The creation is logged.
    /// </summary>
    public Task<long> CreateAsync(CreateIncidentRequest request)
    {
        log.Info($"Creating incident: {request.Title}");
        return repository.CreateAsync(request);
    }

    /// <summary>Applies an edit to an existing incident's fields and logs the action.</summary>
    public Task UpdateAsync(long incidentId, UpdateIncidentRequest request)
    {
        log.Info($"Updating incident {incidentId}");
        return repository.UpdateAsync(incidentId, request);
    }

    /// <summary>
    /// Transitions an incident to the status given by <paramref name="statusCode"/>
    /// (e.g. new → in-progress → resolved → closed). <paramref name="actorUserId"/> records who
    /// performed the change for auditing (null when system-initiated).
    /// </summary>
    public Task SetStatusAsync(long incidentId, string statusCode, int? actorUserId)
        => repository.UpdateStatusAsync(incidentId, statusCode, actorUserId);

    /// <summary>
    /// Assigns (or, when <paramref name="assigneeExtId"/> is null, unassigns) the incident to an
    /// agent identified by external id, attributing the change to <paramref name="actorUserId"/>.
    /// </summary>
    public Task AssignAsync(long incidentId, string? assigneeExtId, int? actorUserId)
        => repository.UpdateAssigneeAsync(incidentId, assigneeExtId, actorUserId);

    /// <summary>
    /// Changes the incident's priority to <paramref name="priorityCode"/> (which drives SLA targets),
    /// attributing the change to <paramref name="actorUserId"/> for the audit trail.
    /// </summary>
    public Task SetPriorityAsync(long incidentId, string priorityCode, int? actorUserId)
        => repository.UpdatePriorityAsync(incidentId, priorityCode, actorUserId);

    /// <summary>
    /// Links an incident to a parent problem (associating a symptom with its root cause),
    /// recording <paramref name="actorUserId"/> as the actor.
    /// </summary>
    public Task LinkToProblemAsync(long incidentId, long problemId, int? actorUserId)
        => repository.LinkToProblemAsync(incidentId, problemId, actorUserId);

    /// <summary>Returns all incidents currently linked to the given problem.</summary>
    public Task<IEnumerable<Incident>> GetByProblemIdAsync(long problemId)
        => repository.GetByProblemIdAsync(problemId);

    /// <summary>
    /// Closes an incident. Business rule: closure is implemented as a status transition to the
    /// fixed "closed" status code, attributed to <paramref name="actorUserId"/>.
    /// </summary>
    public Task CloseAsync(long incidentId, int? actorUserId)
        => repository.UpdateStatusAsync(incidentId, "closed", actorUserId);

    /// <summary>
    /// Closes multiple incidents in one operation. Business rule: each incident is transitioned
    /// to the "closed" status sequentially (one repository call per id, awaited in turn) by the
    /// same actor; the batch size is logged. There is no transaction spanning the batch, so a
    /// failure mid-loop leaves earlier incidents already closed.
    /// </summary>
    public async Task BulkCloseAsync(IEnumerable<long> incidentIds, int? actorUserId)
    {
        var ids = incidentIds.ToList();
        log.Info($"Bulk closing {ids.Count} incidents");
        foreach (var id in ids)
            await repository.UpdateStatusAsync(id, "closed", actorUserId);
    }
}
