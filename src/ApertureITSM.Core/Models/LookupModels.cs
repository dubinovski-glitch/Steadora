namespace ApertureITSM.Core.Models;

// Reference/lookup tables: small, mostly static code lists that classify and drive workflow on
// the main entities. Each typically exposes a stable Code, a human-readable DisplayName, and a
// SortOrder for display.

/// <summary>Incident/problem/change priority level, with default SLA response and resolution targets (minutes).</summary>
public record Priority(byte PriorityId, string Code, string DisplayName, byte SortOrder, int DefaultResponseMin, int DefaultResolutionMin);
/// <summary>Workflow status of an incident. <paramref name="IsTerminal"/> marks closed states; <paramref name="PausesSla"/> indicates the status stops the SLA clock.</summary>
public record IncidentStatus(byte StatusId, string Code, string DisplayName, bool IsTerminal, bool PausesSla, byte SortOrder);
/// <summary>Workflow state of a problem; <paramref name="IsTerminal"/> marks resolved/closed states.</summary>
public record ProblemState(byte StateId, string Code, string DisplayName, byte SortOrder, bool IsTerminal);
/// <summary>Workflow state of a change request; <paramref name="IsTerminal"/> marks completed/closed states.</summary>
public record ChangeState(byte StateId, string Code, string DisplayName, byte SortOrder, bool IsTerminal);
/// <summary>Category of change request (e.g. standard, normal, emergency).</summary>
public record ChangeType(byte ChangeTypeId, string Code, string DisplayName, byte SortOrder);
/// <summary>Risk level assigned to a change request.</summary>
public record Risk(byte RiskId, string Code, string DisplayName, byte SortOrder);
/// <summary>Impact level (breadth of effect) used in incident classification.</summary>
public record Impact(byte ImpactId, string Code, string DisplayName, byte SortOrder);
/// <summary>Urgency level (time sensitivity) used in incident classification.</summary>
public record Urgency(byte UrgencyId, string Code, string DisplayName, byte SortOrder);
/// <summary>A user role/permission set; <paramref name="UserCount"/> is the number of users currently holding it.</summary>
public record Role(byte RoleId, string Code, string DisplayName, string? Description, int UserCount);
/// <summary>A ticket category, optionally scoped to a specific service via <paramref name="ServiceId"/>.</summary>
public record Category(int CategoryId, int? ServiceId, string Code, string DisplayName);
/// <summary>Method by which a caller reported an incident (e.g. phone, email, portal).</summary>
public record ContactMethod(byte ContactMethodId, string Code, string DisplayName, byte SortOrder);
/// <summary>Severity level for major-incident classification.</summary>
public record Severity(byte SeverityId, string Code, string DisplayName, byte SortOrder);
/// <summary>Code describing how an incident was resolved (e.g. fixed, duplicate, no fault found).</summary>
public record ResolutionCode(byte ResolutionCodeId, string Code, string DisplayName, byte SortOrder);
/// <summary>Health status of a service (e.g. operational, degraded, down).</summary>
public record ServiceHealth(byte HealthId, string Code, string DisplayName);
/// <summary>Possible vote a change reviewer can cast (e.g. approve, reject).</summary>
public record ApprovalVote(byte VoteId, string Code, string DisplayName);
