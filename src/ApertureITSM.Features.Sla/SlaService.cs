using ApertureITSM.Core.Interfaces;
using log4net;

namespace ApertureITSM.Features.Sla;

public interface ISlaService
{
    Task<SlaStats> GetDashboardStatsAsync(int days);
    Task<IEnumerable<SlaByPriority>> GetByPriorityAsync(int days);
    Task<IEnumerable<TeamLoad>> GetTeamLoadAsync();
    Task<IEnumerable<DailyVolume>> GetDailyVolumeAsync(int days);
}

/// <summary>
/// Read-only reporting service that surfaces SLA and operational analytics for dashboards:
/// overall SLA stats, breakdown by priority, current team workload, and daily ticket volume.
/// All metrics are computed by <see cref="ISlaRepository"/>; most queries are windowed by a
/// trailing number of days.
/// </summary>
public class SlaService(ISlaRepository repository) : ISlaService
{
    private static readonly ILog log = LogManager.GetLogger(typeof(SlaService));

    /// <summary>
    /// Returns aggregate SLA dashboard statistics over the trailing <paramref name="days"/> window.
    /// Business rule: failures are logged and rethrown (rather than returning empty/default stats)
    /// so the caller is aware the dashboard data could not be produced.
    /// </summary>
    public async Task<SlaStats> GetDashboardStatsAsync(int days)
    {
        try { return await repository.GetStatsAsync(days); }
        catch (Exception ex) { log.Error("Failed to get SLA dashboard stats", ex); throw; }
    }

    /// <summary>Returns SLA performance broken down by priority over the trailing <paramref name="days"/> window.</summary>
    public Task<IEnumerable<SlaByPriority>> GetByPriorityAsync(int days) => repository.GetByPriorityAsync(days);

    /// <summary>Returns the current per-team workload (open/assigned ticket load), independent of any time window.</summary>
    public Task<IEnumerable<TeamLoad>> GetTeamLoadAsync() => repository.GetTeamLoadAsync();

    /// <summary>Returns daily ticket volume counts over the trailing <paramref name="days"/> window for trend charts.</summary>
    public Task<IEnumerable<DailyVolume>> GetDailyVolumeAsync(int days) => repository.GetDailyVolumeAsync(days);
}
