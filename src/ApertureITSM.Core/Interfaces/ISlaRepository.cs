using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

public interface ISlaRepository
{
    Task EvaluateBreachesAsync();
    Task<SlaStats> GetStatsAsync(int days);
    Task<IEnumerable<SlaByPriority>> GetByPriorityAsync(int days);
    Task<IEnumerable<TeamLoad>> GetTeamLoadAsync();
    Task<IEnumerable<DailyVolume>> GetDailyVolumeAsync(int days);
}

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

public class SlaByPriority
{
    public string Priority { get; init; } = string.Empty;
    public int TargetMinutes { get; init; }
    public int TotalIncidents { get; init; }
    public int MetCount { get; init; }
    public int BreachedCount { get; init; }
    public decimal PctMet { get; init; }
}

public class TeamLoad
{
    public string TeamName { get; init; } = string.Empty;
    public int OpenIncidents { get; init; }
    public int MetSla { get; init; }
    public int Breaches { get; init; }
    public decimal PctMet { get; init; }
}

public class DailyVolume
{
    public DateTime BucketDate { get; init; }
    public int OpenedCount { get; init; }
    public int SameDayResolved { get; init; }
}
