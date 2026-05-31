using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using log4net;

namespace ApertureITSM.Features.Changes;

public interface IChangeService
{
    Task<IEnumerable<Change>> GetAllAsync(string? stateFilter);
    Task<Change?> GetDetailAsync(long changeId);
    Task<long> CreateAsync(CreateChangeRequest request);
    Task UpdateAsync(long changeId, UpdateChangeRequest request);
    Task SetStateAsync(long changeId, string stateCode, int? actorUserId);
    Task VoteAsync(long changeId, string userExtId, string voteCode, string? comment);
}

public class ChangeService(IChangeRepository repository) : IChangeService
{
    private static readonly ILog log = LogManager.GetLogger(typeof(ChangeService));

    public Task<IEnumerable<Change>> GetAllAsync(string? stateFilter)
        => repository.GetAllAsync(stateFilter);

    public Task<Change?> GetDetailAsync(long changeId)
        => repository.GetByIdAsync(changeId);

    public Task<long> CreateAsync(CreateChangeRequest request)
    {
        log.Info($"Creating change: {request.Title}");
        return repository.CreateAsync(request);
    }

    public Task UpdateAsync(long changeId, UpdateChangeRequest request)
    {
        log.Info($"Updating change {changeId}");
        return repository.UpdateAsync(changeId, request);
    }

    public Task SetStateAsync(long changeId, string stateCode, int? actorUserId)
        => repository.UpdateStateAsync(changeId, stateCode, actorUserId);

    public Task VoteAsync(long changeId, string userExtId, string voteCode, string? comment)
    {
        log.Info($"Vote {voteCode} on change {changeId} by {userExtId}");
        return repository.VoteAsync(changeId, userExtId, voteCode, comment);
    }
}
