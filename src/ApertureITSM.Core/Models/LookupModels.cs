namespace ApertureITSM.Core.Models;

public record Priority(byte PriorityId, string Code, string DisplayName, byte SortOrder, int DefaultResponseMin, int DefaultResolutionMin);
public record IncidentStatus(byte StatusId, string Code, string DisplayName, bool IsTerminal, bool PausesSla, byte SortOrder);
public record ProblemState(byte StateId, string Code, string DisplayName, byte SortOrder, bool IsTerminal);
public record ChangeState(byte StateId, string Code, string DisplayName, byte SortOrder, bool IsTerminal);
public record ChangeType(byte ChangeTypeId, string Code, string DisplayName, byte SortOrder);
public record Risk(byte RiskId, string Code, string DisplayName, byte SortOrder);
public record Impact(byte ImpactId, string Code, string DisplayName, byte SortOrder);
public record Urgency(byte UrgencyId, string Code, string DisplayName, byte SortOrder);
public record Role(byte RoleId, string Code, string DisplayName, string? Description, int UserCount);
public record Category(int CategoryId, int? ServiceId, string Code, string DisplayName, int SortOrder);
public record ContactMethod(byte ContactMethodId, string Code, string DisplayName, byte SortOrder);
public record Severity(byte SeverityId, string Code, string DisplayName, byte SortOrder);
public record ResolutionCode(byte ResolutionCodeId, string Code, string DisplayName, byte SortOrder);
public record ServiceHealth(byte HealthId, string Code, string DisplayName);
public record ApprovalVote(byte VoteId, string Code, string DisplayName);
