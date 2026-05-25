using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

public interface IProblemRepository
{
    Task<IEnumerable<Problem>> GetAllAsync(bool includeResolved = false, int[]? groupIds = null);
    Task<Problem?> GetByIdAsync(long problemId);
    Task<long> CreateAsync(CreateProblemRequest request);
    Task UpdateAsync(long problemId, UpdateProblemRequest request);
    Task UpdateStateAsync(long problemId, string stateCode, int? actorUserId);
    Task UpdateFieldAsync(long problemId, string field, string? value, int? actorUserId);
}

public class CreateProblemRequest
{
    public string Title { get; init; } = string.Empty;
    public string? RootCause { get; init; }
    public string? Workaround { get; init; }
    public string PriorityCode { get; init; } = "medium";
    public string? AssigneeExtId { get; init; }
    public string? GroupSlug { get; init; }
    public bool IsKnownError { get; init; }
}

public class UpdateProblemRequest
{
    public string Title { get; init; } = string.Empty;
    public string? RootCause { get; init; }
    public string? Workaround { get; init; }
    public string PriorityCode { get; init; } = "medium";
    public string? AssigneeExtId { get; init; }
    public string? GroupSlug { get; init; }
    public bool IsKnownError { get; init; }
    public string? ActorExtId { get; init; }
}
