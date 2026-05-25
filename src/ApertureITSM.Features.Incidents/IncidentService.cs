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

public class IncidentService(IIncidentRepository repository) : IIncidentService
{
    private static readonly ILog log = LogManager.GetLogger(typeof(IncidentService));

    public Task<(IEnumerable<Incident> Items, int Total)> GetQueueAsync(IncidentFilter filter, int page, int pageSize)
        => repository.GetPagedAsync(filter, page, pageSize);

    public Task<Incident?> GetDetailAsync(long incidentId)
        => repository.GetByIdAsync(incidentId);

    public Task<long> CreateAsync(CreateIncidentRequest request)
    {
        log.Info($"Creating incident: {request.Title}");
        return repository.CreateAsync(request);
    }

    public Task UpdateAsync(long incidentId, UpdateIncidentRequest request)
    {
        log.Info($"Updating incident {incidentId}");
        return repository.UpdateAsync(incidentId, request);
    }

    public Task SetStatusAsync(long incidentId, string statusCode, int? actorUserId)
        => repository.UpdateStatusAsync(incidentId, statusCode, actorUserId);

    public Task AssignAsync(long incidentId, string? assigneeExtId, int? actorUserId)
        => repository.UpdateAssigneeAsync(incidentId, assigneeExtId, actorUserId);

    public Task SetPriorityAsync(long incidentId, string priorityCode, int? actorUserId)
        => repository.UpdatePriorityAsync(incidentId, priorityCode, actorUserId);

    public Task LinkToProblemAsync(long incidentId, long problemId, int? actorUserId)
        => repository.LinkToProblemAsync(incidentId, problemId, actorUserId);

    public Task<IEnumerable<Incident>> GetByProblemIdAsync(long problemId)
        => repository.GetByProblemIdAsync(problemId);

    public Task CloseAsync(long incidentId, int? actorUserId)
        => repository.UpdateStatusAsync(incidentId, "closed", actorUserId);

    public async Task BulkCloseAsync(IEnumerable<long> incidentIds, int? actorUserId)
    {
        var ids = incidentIds.ToList();
        log.Info($"Bulk closing {ids.Count} incidents");
        foreach (var id in ids)
            await repository.UpdateStatusAsync(id, "closed", actorUserId);
    }
}
