namespace ApertureITSM.Core.Models;

public class Problem
{
    public long ProblemId { get; init; }
    public string Number { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? RootCause { get; init; }
    public string? Workaround { get; init; }

    public byte PriorityId { get; init; }
    public string PriorityCode { get; init; } = string.Empty;
    public byte StateId { get; init; }
    public string StateCode { get; init; } = string.Empty;
    public string StateName { get; init; } = string.Empty;
    public bool IsKnownError { get; init; }

    public int? AssigneeUserId { get; init; }
    public string? AssigneeName { get; init; }
    public string? AssigneeInitials { get; init; }
    public string? AssigneeColor { get; init; }
    public int? GroupId { get; init; }
    public string? GroupName { get; init; }

    public DateTime OpenedAt { get; init; }
    public DateTime? ResolvedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }

    public int LinkedIncidentCount { get; init; }
    public List<string> AffectedServiceSlugs { get; set; } = [];
}
