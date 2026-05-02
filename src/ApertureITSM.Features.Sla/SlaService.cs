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

public class SlaService(ISlaRepository repository) : ISlaService
{
    private static readonly ILog log = LogManager.GetLogger(typeof(SlaService));

    public async Task<SlaStats> GetDashboardStatsAsync(int days)
    {
        try { return await repository.GetStatsAsync(days); }
        catch (Exception ex) { log.Error("Failed to get SLA dashboard stats", ex); throw; }
    }

    public Task<IEnumerable<SlaByPriority>> GetByPriorityAsync(int days) => repository.GetByPriorityAsync(days);
    public Task<IEnumerable<TeamLoad>> GetTeamLoadAsync() => repository.GetTeamLoadAsync();
    public Task<IEnumerable<DailyVolume>> GetDailyVolumeAsync(int days) => repository.GetDailyVolumeAsync(days);
}
