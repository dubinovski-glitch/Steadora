namespace ApertureITSM.Core.Models;

/// <summary>
/// A unit of work, either standalone or linked to a parent incident/problem/change record.
/// Tracks type, status, scheduling, and assignment.
/// </summary>
// Named TaskItem (not Task) to avoid colliding with System.Threading.Tasks.Task.
public class TaskItem
{
    public long TaskId { get; init; }
    public string Number { get; init; } = string.Empty;   // e.g. INCTASK-00000013
    public string TaskType { get; init; } = string.Empty; // incident|problem|change|general
    public string Title { get; init; } = string.Empty;
    public string? ReferenceNumber { get; init; }          // linked record (INC-/PRB-/CHG-); null for general

    public byte PriorityId { get; init; }
    public string PriorityCode { get; init; } = string.Empty;
    public string StatusCode { get; init; } = "open";      // open|progress|onhold|done
    public string? OnHoldReason { get; init; }
    public DateTime? DueDate { get; init; }

    public string? Subtype { get; init; }                  // per-type category
    public DateTime? PlannedStart { get; init; }
    public DateTime? PlannedEnd { get; init; }

    public int? AssigneeUserId { get; init; }
    public string? AssigneeName { get; init; }
    public string? AssigneeInitials { get; init; }
    public string? AssigneeColor { get; init; }
    public int? GroupId { get; init; }
    public string? GroupName { get; init; }

    public string? Description { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

/// <summary>Payload for creating a new task; optional fields default to null/unset.</summary>
public record CreateTaskRequest(
    string TaskType,
    string Title,
    string? ReferenceNumber,
    string PriorityCode,
    int? AssigneeUserId,
    int? GroupId,
    DateTime? DueDate,
    string? Description,
    string? StatusCode = null,
    string? OnHoldReason = null,
    string? Subtype = null,
    DateTime? PlannedStart = null,
    DateTime? PlannedEnd = null);

/// <summary>Payload for updating an existing task's editable fields.</summary>
public record UpdateTaskRequest(
    string Title,
    string PriorityCode,
    string StatusCode,
    string? OnHoldReason,
    int? AssigneeUserId,
    int? GroupId,
    DateTime? DueDate,
    string? Description,
    string? ReferenceNumber,
    string? Subtype,
    DateTime? PlannedStart,
    DateTime? PlannedEnd);

/// <summary>
/// A lightweight reference to a record (incident/problem/change) that a task can be linked to,
/// used for selection/lookup.
/// </summary>
// A record (incident/problem/change) a task can be linked to
public class LinkableRecord
{
    public string Number { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
}
