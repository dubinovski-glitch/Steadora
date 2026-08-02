using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Provides data access for problem records, including querying, creation, updates and
/// state transitions.
/// </summary>
public interface IProblemRepository
{
    /// <summary>Gets a paged list of problems (optionally including resolved and scoped by group and/or assignee) with the total count.</summary>
    Task<(IEnumerable<Problem> Items, int Total)> GetAllAsync(bool includeResolved = false, int[]? groupIds = null, int? assigneeUserId = null, int page = 1, int pageSize = 25);
    /// <summary>Gets a single problem by its identifier, or null if not found.</summary>
    Task<Problem?> GetByIdAsync(long problemId);
    /// <summary>Creates a new problem and returns its identifier.</summary>
    Task<long> CreateAsync(CreateProblemRequest request);
    /// <summary>Updates the editable fields of an existing problem.</summary>
    Task UpdateAsync(long problemId, UpdateProblemRequest request);
    /// <summary>Changes a problem's state, recording the acting user.</summary>
    Task UpdateStateAsync(long problemId, string stateCode, int? actorUserId);
    /// <summary>Updates a single named field on a problem, recording the acting user.</summary>
    Task UpdateFieldAsync(long problemId, string field, string? value, int? actorUserId);
}

/// <summary>Data required to create a new problem.</summary>
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

/// <summary>Data used to update the editable fields of an existing problem.</summary>
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
