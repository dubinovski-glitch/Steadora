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

/// <summary>
/// Application service for change requests (change management). Covers listing, detail,
/// creation, update, lifecycle state transitions, and change-advisory-board (CAB) voting,
/// delegating persistence to <see cref="IChangeRepository"/>.
/// </summary>
public class ChangeService(IChangeRepository repository) : IChangeService
{
    private static readonly ILog log = LogManager.GetLogger(typeof(ChangeService));

    /// <summary>
    /// Returns all change requests, optionally filtered to a single lifecycle state.
    /// Business rule: a null/empty <paramref name="stateFilter"/> returns changes across all states.
    /// </summary>
    public Task<IEnumerable<Change>> GetAllAsync(string? stateFilter)
        => repository.GetAllAsync(stateFilter);

    /// <summary>Returns the full detail of a single change request, or null if not found.</summary>
    public Task<Change?> GetDetailAsync(long changeId)
        => repository.GetByIdAsync(changeId);

    /// <summary>
    /// Creates a new change request and returns its generated id (assigned by the repository/database).
    /// The creation is logged.
    /// </summary>
    public Task<long> CreateAsync(CreateChangeRequest request)
    {
        log.Info($"Creating change: {request.Title}");
        return repository.CreateAsync(request);
    }

    /// <summary>Applies an edit to an existing change request's fields and logs the action.</summary>
    public Task UpdateAsync(long changeId, UpdateChangeRequest request)
    {
        log.Info($"Updating change {changeId}");
        return repository.UpdateAsync(changeId, request);
    }

    /// <summary>
    /// Transitions a change request to the lifecycle state given by <paramref name="stateCode"/>
    /// (e.g. draft → assess → approve → implement → closed). <paramref name="actorUserId"/> records
    /// who made the transition for the audit trail.
    /// </summary>
    public Task SetStateAsync(long changeId, string stateCode, int? actorUserId)
        => repository.UpdateStateAsync(changeId, stateCode, actorUserId);

    /// <summary>
    /// Records a CAB approval vote on a change request. Business rule: <paramref name="voteCode"/>
    /// captures the vote outcome (e.g. approve/reject) cast by the user identified by
    /// <paramref name="userExtId"/>, with an optional justification <paramref name="comment"/>.
    /// The vote is logged.
    /// </summary>
    public Task VoteAsync(long changeId, string userExtId, string voteCode, string? comment)
    {
        log.Info($"Vote {voteCode} on change {changeId} by {userExtId}");
        return repository.VoteAsync(changeId, userExtId, voteCode, comment);
    }
}
