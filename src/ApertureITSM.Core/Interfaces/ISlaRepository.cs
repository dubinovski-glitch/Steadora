using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Provides SLA evaluation and reporting data used by dashboards and metrics views.
/// </summary>
public interface ISlaRepository
{
    /// <summary>Evaluates open records and flags or records any SLA breaches.</summary>
    Task EvaluateBreachesAsync();
    /// <summary>Gets summary SLA statistics over the trailing number of days.</summary>
    Task<SlaStats> GetStatsAsync(int days);
    /// <summary>Gets SLA attainment broken down by priority over the trailing number of days.</summary>
    Task<IEnumerable<SlaByPriority>> GetByPriorityAsync(int days);
    /// <summary>Gets the current workload and SLA performance per team.</summary>
    Task<IEnumerable<TeamLoad>> GetTeamLoadAsync();
    /// <summary>Gets daily opened/resolved volume over the trailing number of days.</summary>
    Task<IEnumerable<DailyVolume>> GetDailyVolumeAsync(int days);
}

/// <summary>Aggregate SLA and incident statistics for a dashboard summary.</summary>
public class SlaStats
{
    public int OpenIncidents { get; init; }
    public int SlaAtRisk { get; init; }
    public int ChangesThisWeek { get; init; }
    public long? AvgResolutionMinutes { get; init; }
    public decimal SlaMetPercent { get; init; }
    public int SlaBreachCount { get; init; }
    public int TotalResolved { get; init; }
}

/// <summary>SLA attainment figures for a single priority level.</summary>
public class SlaByPriority
{
    public string Priority { get; init; } = string.Empty;
    public int TargetMinutes { get; init; }
    public int TotalIncidents { get; init; }
    public int MetCount { get; init; }
    public int BreachedCount { get; init; }
    public decimal PctMet { get; init; }
}

/// <summary>Workload and SLA performance figures for a single team.</summary>
public class TeamLoad
{
    public string TeamName { get; init; } = string.Empty;
    public int OpenIncidents { get; init; }
    public int MetSla { get; init; }
    public int Breaches { get; init; }
    public decimal PctMet { get; init; }
}

/// <summary>Opened and same-day-resolved incident counts for a single day.</summary>
public class DailyVolume
{
    public DateTime BucketDate { get; init; }
    public int OpenedCount { get; init; }
    public int SameDayResolved { get; init; }
}
