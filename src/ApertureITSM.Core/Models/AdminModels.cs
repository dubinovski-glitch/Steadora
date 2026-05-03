namespace ApertureITSM.Core.Models;

public record SubCategory(int SubCategoryId, int CategoryId, string Code, string DisplayName, int SortOrder);

public class CategoryWithSubs
{
    public int CategoryId { get; init; }
    public int? ServiceId { get; init; }
    public string? ServiceName { get; init; }
    public string Code { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public int SortOrder { get; init; }
    public int TicketCount { get; init; }
    public List<SubCategory> SubCategories { get; init; } = [];
}

public class SlaTier
{
    public int SlaTierId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsActive { get; init; }
    public bool Calculate247 { get; init; }
    public bool AutoEscalate { get; init; }
    public int SortOrder { get; init; }
    public List<SlaTierTarget> Targets { get; init; } = [];
}

public record SlaTierTarget(
    int TargetId,
    int SlaTierId,
    byte PriorityId,
    string PriorityCode,
    string PriorityDisplayName,
    int ResponseMinutes,
    int ResolutionMinutes);

public class BusinessCalendar
{
    public int CalendarId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Timezone { get; init; } = string.Empty;
    public bool IsDefault { get; init; }
    public List<BusinessDay> Days { get; init; } = [];
    public List<BusinessHoliday> Holidays { get; init; } = [];
}

public record BusinessDay(int DayId, int CalendarId, int DayOfWeek, string? StartTime, string? EndTime);
public record BusinessHoliday(int HolidayId, int CalendarId, string HolidayDate, string Name);
public record Automation(int AutomationId, string Name, string WhenDescription, string ThenDescription, bool IsEnabled, int RunCount30d);
public record PriorityMatrixRow(byte ImpactId, byte UrgencyId, byte PriorityId);
