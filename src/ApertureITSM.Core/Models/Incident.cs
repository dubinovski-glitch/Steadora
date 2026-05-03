namespace ApertureITSM.Core.Models;

public class Incident
{
    public long IncidentId { get; init; }
    public string Number { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? StepsToReproduce { get; init; }

    public byte PriorityId { get; init; }
    public string PriorityCode { get; init; } = string.Empty;
    public byte StatusId { get; init; }
    public string StatusCode { get; init; } = string.Empty;
    public byte? ImpactId { get; init; }
    public string? ImpactCode { get; init; }
    public byte? UrgencyId { get; init; }
    public string? UrgencyCode { get; init; }
    public byte? SeverityId { get; init; }
    public string? SeverityCode { get; init; }
    public int? CategoryId { get; init; }
    public string? CategoryName { get; init; }
    public int? SubCategoryId { get; init; }
    public string? SubCategoryCode { get; init; }
    public string? SubCategoryName { get; init; }

    public int? ServiceId { get; init; }
    public string? ServiceName { get; init; }
    public int? CiId { get; init; }
    public string? CiAssetTag { get; init; }

    public int? ReporterUserId { get; init; }
    public string? ReporterName { get; init; }
    public string? ReporterDisplay { get; init; }
    public int? CallerUserId { get; init; }
    public string? CallerName { get; init; }
    public byte? ContactMethodId { get; init; }
    public string? ContactMethodCode { get; init; }
    public string? Location { get; init; }
    public int? AssigneeUserId { get; init; }
    public string? AssigneeName { get; init; }
    public string? AssigneeInitials { get; init; }
    public string? AssigneeColor { get; init; }
    public int? GroupId { get; init; }
    public string? GroupName { get; init; }

    public bool IsMajorIncident { get; init; }
    public int ReassignCount { get; init; }

    public byte? ResolutionCodeId { get; init; }
    public string? ResolutionCode { get; init; }
    public string? ResolutionCodeName { get; init; }
    public string? ResolutionNotes { get; init; }

    public int? SlaPolicyId { get; init; }
    public int? SlaTargetMinutes { get; init; }
    public int? SlaResponseTargetMinutes { get; init; }
    public DateTime? SlaStartedAt { get; init; }
    public int SlaPausedSeconds { get; init; }
    public DateTime? SlaPausedAt { get; init; }
    public DateTime? SlaBreachedAt { get; init; }
    public DateTime? SlaWarnedAt { get; init; }
    public DateTime? FirstResponseAt { get; init; }
    public int ReopenCount { get; init; }

    public DateTime OpenedAt { get; init; }
    public DateTime? ResolvedAt { get; init; }
    public DateTime? ClosedAt { get; init; }

    public long? ParentProblemId { get; init; }
    public string? ParentProblemNumber { get; init; }
    public long? RelatedChangeId { get; init; }
    public long? RelatedKbArticleId { get; init; }

    public byte? CsatScore { get; init; }
    public bool? IsFirstCallResolution { get; init; }
    public bool IsKbArticleCreated { get; init; }

    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }

    public int CommentCount { get; init; }
    public int LinkedCount { get; init; }

    public decimal? SlaPercent =>
        SlaTargetMinutes is null or 0 || SlaStartedAt is null
            ? null
            : Math.Round(100m * ((decimal)(DateTime.UtcNow - SlaStartedAt.Value).TotalMinutes - SlaPausedSeconds / 60m) / SlaTargetMinutes.Value, 1);
}
