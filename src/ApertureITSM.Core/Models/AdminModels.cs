namespace ApertureITSM.Core.Models;

/// <summary>A second-level classification nested under a <see cref="Category"/>.</summary>
public record SubCategory(int SubCategoryId, int CategoryId, string Code, string DisplayName);

/// <summary>
/// An admin-facing view of a category together with its sub-categories, optionally scoped to a
/// service. <see cref="TicketCount"/> is the number of tickets using this category.
/// </summary>
public class CategoryWithSubs
{
    public int CategoryId { get; init; }
    public int? ServiceId { get; init; }
    public string? ServiceName { get; init; }
    public string Code { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public int TicketCount { get; init; }
    public List<SubCategory> SubCategories { get; init; } = [];
}

/// <summary>
/// A service-level agreement tier defining response/resolution targets per priority (via
/// <see cref="Targets"/>) along with escalation and calculation settings.
/// </summary>
public class SlaTier
{
    public int SlaTierId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsActive { get; init; }
    public bool Calculate247 { get; init; } // measure SLA around the clock vs. business hours only
    public bool AutoEscalate { get; init; } // automatically escalate on breach/warning
    public int SortOrder { get; init; }
    public List<SlaTierTarget> Targets { get; init; } = [];
}

/// <summary>A single SLA target within a tier: response and resolution budgets (minutes) for one priority.</summary>
public record SlaTierTarget(
    int TargetId,
    int SlaTierId,
    byte PriorityId,
    string PriorityCode,
    string PriorityDisplayName,
    int ResponseMinutes,
    int ResolutionMinutes);

/// <summary>
/// A business calendar defining working hours and holidays in a given timezone, used for
/// business-hours SLA calculations.
/// </summary>
public class BusinessCalendar
{
    public int CalendarId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Timezone { get; init; } = string.Empty;
    public bool IsDefault { get; init; }
    public List<BusinessDay> Days { get; init; } = [];
    public List<BusinessHoliday> Holidays { get; init; } = [];
}

/// <summary>Working hours for one day of week within a calendar; null start/end means a non-working day.</summary>
public record BusinessDay(int DayId, int CalendarId, int DayOfWeek, string? StartTime, string? EndTime);
/// <summary>A non-working holiday date within a business calendar.</summary>
public record BusinessHoliday(int HolidayId, int CalendarId, string HolidayDate, string Name);
/// <summary>A configurable when/then automation rule; <paramref name="RunCount30d"/> is its execution count over the last 30 days.</summary>
public record Automation(int AutomationId, string Name, string WhenDescription, string ThenDescription, bool IsEnabled, int RunCount30d);
