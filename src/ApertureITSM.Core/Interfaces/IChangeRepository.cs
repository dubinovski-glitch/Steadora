using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

public interface IChangeRepository
{
    Task<IEnumerable<Change>> GetAllAsync(string? stateFilter = null);
    Task<Change?> GetByIdAsync(long changeId);
    Task<long> CreateAsync(CreateChangeRequest request);
    Task UpdateAsync(long changeId, UpdateChangeRequest request);
    Task UpdateStateAsync(long changeId, string stateCode, int? actorUserId);
    Task VoteAsync(long changeId, string userExtId, string voteCode, string? comment);
}

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
