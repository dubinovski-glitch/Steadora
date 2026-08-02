using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Provides data access for change records, including querying, creation, updates,
/// state transitions and CAB voting.
/// </summary>
public interface IChangeRepository
{
    /// <summary>Gets all changes, optionally filtered by state.</summary>
    Task<IEnumerable<Change>> GetAllAsync(string? stateFilter = null);
    /// <summary>Gets a single change by its identifier, or null if not found.</summary>
    Task<Change?> GetByIdAsync(long changeId);
    /// <summary>Creates a new change and returns its identifier.</summary>
    Task<long> CreateAsync(CreateChangeRequest request);
    /// <summary>Updates the editable fields of an existing change.</summary>
    Task UpdateAsync(long changeId, UpdateChangeRequest request);
    /// <summary>Changes a change record's state, recording the acting user.</summary>
    Task UpdateStateAsync(long changeId, string stateCode, int? actorUserId);
    /// <summary>Records a CAB member's vote (with optional comment) on a change.</summary>
    Task VoteAsync(long changeId, string userExtId, string voteCode, string? comment);
}

/// <summary>Data used to update the editable fields of an existing change.</summary>
public class UpdateChangeRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? RolloutPlan { get; init; }
    public string? RollbackPlan { get; init; }
    public string? ImpactNotes { get; init; }
    public string ChangeTypeCode { get; init; } = "normal";
    public string RiskCode { get; init; } = "medium";
    public string? OwnerExtId { get; init; }
    public string? ApproverExtId { get; init; }
    public string? GroupSlug { get; init; }
    public string? CabName { get; init; }
    public DateTime? ScheduledStart { get; init; }
    public DateTime? ScheduledEnd { get; init; }
    public string? DowntimeEstimate { get; init; }
}

/// <summary>Data required to create a new change.</summary>
public class CreateChangeRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? RolloutPlan { get; init; }
    public string? RollbackPlan { get; init; }
    public string? ImpactNotes { get; init; }
    public string ChangeTypeCode { get; init; } = "normal";
    public string RiskCode { get; init; } = "medium";
    public string? OwnerExtId { get; init; }
    public string? ApproverExtId { get; init; }
    public string? GroupSlug { get; init; }
    public string? CabName { get; init; }
    public DateTime? ScheduledStart { get; init; }
    public DateTime? ScheduledEnd { get; init; }
    public string? DowntimeEstimate { get; init; }
}
