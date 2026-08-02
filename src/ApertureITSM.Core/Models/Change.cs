namespace ApertureITSM.Core.Models;

/// <summary>
/// An ITIL change request describing a planned modification to a service or configuration item,
/// including its rollout/rollback plans, risk and type classification, approval workflow state,
/// and scheduling window.
/// </summary>
public class Change
{
    public long ChangeId { get; init; }
    public string Number { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? RolloutPlan { get; init; }
    public string? RollbackPlan { get; init; }
    public string? ImpactNotes { get; init; }

    public byte ChangeTypeId { get; init; }
    public string ChangeTypeCode { get; init; } = string.Empty;
    public byte RiskId { get; init; }
    public string RiskCode { get; init; } = string.Empty;
    public byte StateId { get; init; }
    public string StateCode { get; init; } = string.Empty;
    public string StateName { get; init; } = string.Empty;

    public int? OwnerUserId { get; init; }
    public string? OwnerName { get; init; }
    public string? OwnerInitials { get; init; }
    public string? OwnerColor { get; init; }
    public int? ApproverUserId { get; init; }
    public string? ApproverName { get; init; }
    public int? GroupId { get; init; }
    public string? GroupName { get; init; }

    public string? CabName { get; init; } // Change Advisory Board responsible for review
    public DateTime? ScheduledStart { get; init; }
    public DateTime? ScheduledEnd { get; init; }
    public string? DowntimeEstimate { get; init; }

    public DateTime? SubmittedAt { get; init; }
    public DateTime? ApprovedAt { get; init; }
    public DateTime? CompletedAt { get; init; }

    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }

    public List<ChangeReviewer> Reviewers { get; set; } = [];
    public List<string> AffectedServiceSlugs { get; set; } = []; // services impacted by this change
}

/// <summary>
/// A reviewer assigned to vote on a change request, capturing their approval vote and optional
/// comment as part of the change approval workflow.
/// </summary>
public class ChangeReviewer
{
    public long ChangeReviewerId { get; init; }
    public long ChangeId { get; init; }
    public int UserId { get; init; }
    public string UserName { get; init; } = string.Empty;
    public string? UserInitials { get; init; }
    public string? UserColor { get; init; }
    public byte VoteId { get; init; }
    public string VoteCode { get; init; } = string.Empty;
    public string? Comment { get; init; }
    public DateTime? VotedAt { get; init; }
}
