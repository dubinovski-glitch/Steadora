using ApertureITSM.Core.Interfaces;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

public class SlaRepository(IDbConnectionFactory db, IWorkspaceContext workspace) : ISlaRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(SlaRepository));

    public async Task EvaluateBreachesAsync()
    {
        string sql = "reporting.usp_EvaluateSlaBreaches";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, commandType: System.Data.CommandType.StoredProcedure, commandTimeout: 60);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "SLA breach evaluation failed", sql, ex);
            throw;
        }
    }

    public async Task<SlaStats> GetStatsAsync(int days)
    {
        string sql = "reporting.usp_DashboardKpis";
        try
        {
            using var conn = db.Create();
            var wid = workspace.WorkspaceId;
            var kpis = await conn.QueryFirstAsync<dynamic>(sql,
                new { WorkspaceId = wid },
                commandType: System.Data.CommandType.StoredProcedure);

            sql = """
                SELECT COUNT(*) AS Total,
                       SUM(CASE WHEN SlaBreachedAt IS NULL THEN 1 ELSE 0 END) AS Met
                FROM itil.Incident
                WHERE ResolvedAt IS NOT NULL
                  AND ResolvedAt >= DATEADD(DAY, -@days, SYSUTCDATETIME())
                  AND DeletedAt IS NULL
                  AND WorkspaceId = @wid
                """;
            var slaResult = await conn.QueryFirstAsync<(int Total, int Met)>(sql, new { days, wid });

            return new SlaStats
            {
                OpenIncidents = (int)kpis.OpenIncidents,
                SlaAtRisk = (int)kpis.SlaAtRisk,
                ChangesThisWeek = (int)kpis.ChangesThisWeek,
                AvgResolutionMinutes = (long?)kpis.AvgResolutionMinutes,
                SlaMetPercent = slaResult.Total == 0 ? 0 : Math.Round(100m * slaResult.Met / slaResult.Total, 1),
                SlaBreachCount = slaResult.Total - slaResult.Met,
                TotalResolved = slaResult.Total
            };
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get SLA stats", sql, ex);
            throw;
        }
    }

    public async Task<IEnumerable<SlaByPriority>> GetByPriorityAsync(int days)
    {
        string sql = """
            SELECT pr.Code AS Priority, pr.DefaultResolutionMin AS TargetMinutes,
                   COUNT(*) AS TotalIncidents,
                   SUM(CASE WHEN i.SlaBreachedAt IS NULL THEN 1 ELSE 0 END) AS MetCount,
                   SUM(CASE WHEN i.SlaBreachedAt IS NOT NULL THEN 1 ELSE 0 END) AS BreachedCount,
                   CAST(100.0 * SUM(CASE WHEN i.SlaBreachedAt IS NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0) AS DECIMAL(5,2)) AS PctMet
            FROM itil.Incident i
            JOIN lookup.Priority pr ON pr.PriorityId = i.PriorityId
            WHERE i.DeletedAt IS NULL AND i.OpenedAt >= DATEADD(DAY,-@days,SYSUTCDATETIME())
              AND i.WorkspaceId = @wid
            GROUP BY pr.Code, pr.DefaultResolutionMin, pr.SortOrder
            ORDER BY pr.SortOrder
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<SlaByPriority>(sql, new { days, wid = workspace.WorkspaceId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get SLA stats by priority", sql, ex);
            throw;
        }
    }

    public async Task<IEnumerable<TeamLoad>> GetTeamLoadAsync()
    {
        string sql = """
            SELECT g.Name AS TeamName, COUNT(*) AS OpenIncidents,
                   SUM(CASE WHEN i.SlaBreachedAt IS NULL THEN 1 ELSE 0 END) AS MetSla,
                   SUM(CASE WHEN i.SlaBreachedAt IS NOT NULL THEN 1 ELSE 0 END) AS Breaches,
                   CAST(100.0 * SUM(CASE WHEN i.SlaBreachedAt IS NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0) AS DECIMAL(5,2)) AS PctMet
            FROM itil.Incident i
            JOIN core.[Group] g ON g.GroupId = i.GroupId
            JOIN lookup.IncidentStatus s ON s.StatusId = i.StatusId AND s.IsTerminal = 0
            WHERE i.DeletedAt IS NULL AND i.WorkspaceId = @wid
            GROUP BY g.Name
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<TeamLoad>(sql, new { wid = workspace.WorkspaceId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get team load", sql, ex);
            throw;
        }
    }

    public async Task<IEnumerable<DailyVolume>> GetDailyVolumeAsync(int days)
    {
        string sql = """
            SELECT CONVERT(date, OpenedAt) AS BucketDate,
                   COUNT(*) AS OpenedCount,
                   SUM(CASE WHEN ResolvedAt IS NOT NULL AND CONVERT(date, ResolvedAt) = CONVERT(date, OpenedAt) THEN 1 ELSE 0 END) AS SameDayResolved
            FROM itil.Incident
            WHERE DeletedAt IS NULL AND OpenedAt >= DATEADD(DAY,-@days,SYSUTCDATETIME())
              AND WorkspaceId = @wid
            GROUP BY CONVERT(date, OpenedAt)
            ORDER BY BucketDate
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<DailyVolume>(sql, new { days, wid = workspace.WorkspaceId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get daily volume", sql, ex);
            throw;
        }
    }
}
