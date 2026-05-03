using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

public class LookupRepository(IDbConnectionFactory db) : ILookupRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(LookupRepository));

    public async Task<IEnumerable<Priority>> GetPrioritiesAsync()
    {
        string sql = "SELECT * FROM lookup.Priority ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<Priority>(sql); }
        catch (Exception ex) { SqlLogger.LogError(log, "Failed to get priorities", sql, ex); throw; }
    }

    public async Task<IEnumerable<IncidentStatus>> GetIncidentStatusesAsync()
    {
        string sql = "SELECT * FROM lookup.IncidentStatus ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<IncidentStatus>(sql); }
        catch (Exception ex) { SqlLogger.LogError(log, "Failed to get incident statuses", sql, ex); throw; }
    }

    public async Task<IEnumerable<ProblemState>> GetProblemStatesAsync()
    {
        string sql = "SELECT * FROM lookup.ProblemState ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<ProblemState>(sql); }
        catch (Exception ex) { SqlLogger.LogError(log, "Failed to get problem states", sql, ex); throw; }
    }

    public async Task<IEnumerable<ChangeState>> GetChangeStatesAsync()
    {
        string sql = "SELECT * FROM lookup.ChangeState ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<ChangeState>(sql); }
        catch (Exception ex) { SqlLogger.LogError(log, "Failed to get change states", sql, ex); throw; }
    }

    public async Task<IEnumerable<ChangeType>> GetChangeTypesAsync()
    {
        string sql = "SELECT * FROM lookup.ChangeType ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<ChangeType>(sql); }
        catch (Exception ex) { SqlLogger.LogError(log, "Failed to get change types", sql, ex); throw; }
    }

    public async Task<IEnumerable<Risk>> GetRisksAsync()
    {
        string sql = "SELECT * FROM lookup.Risk ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<Risk>(sql); }
        catch (Exception ex) { SqlLogger.LogError(log, "Failed to get risks", sql, ex); throw; }
    }

    public async Task<IEnumerable<Impact>> GetImpactsAsync()
    {
        string sql = "SELECT * FROM lookup.Impact ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<Impact>(sql); }
        catch (Exception ex) { SqlLogger.LogError(log, "Failed to get impacts", sql, ex); throw; }
    }

    public async Task<IEnumerable<Urgency>> GetUrgenciesAsync()
    {
        string sql = "SELECT * FROM lookup.Urgency ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<Urgency>(sql); }
        catch (Exception ex) { SqlLogger.LogError(log, "Failed to get urgencies", sql, ex); throw; }
    }

    public async Task<IEnumerable<Category>> GetCategoriesAsync()
    {
        string sql = "SELECT CategoryId, ServiceId, Code, DisplayName, SortOrder FROM lookup.Category ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<Category>(sql); }
        catch (Exception ex) { SqlLogger.LogError(log, "Failed to get categories", sql, ex); throw; }
    }

    public async Task<IEnumerable<SubCategory>> GetSubCategoriesAsync(int categoryId)
    {
        string sql = "SELECT SubCategoryId, CategoryId, Code, DisplayName, SortOrder FROM lookup.SubCategory WHERE CategoryId=@categoryId ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<SubCategory>(sql, new { categoryId }); }
        catch (Exception ex) { SqlLogger.LogError(log, $"Failed to get subcategories for category {categoryId}", sql, ex); throw; }
    }

    public async Task<IEnumerable<ContactMethod>> GetContactMethodsAsync()
    {
        string sql = "SELECT * FROM lookup.ContactMethod ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<ContactMethod>(sql); }
        catch (Exception ex) { SqlLogger.LogError(log, "Failed to get contact methods", sql, ex); throw; }
    }

    public async Task<IEnumerable<Severity>> GetSeveritiesAsync()
    {
        string sql = "SELECT * FROM lookup.Severity ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<Severity>(sql); }
        catch (Exception ex) { SqlLogger.LogError(log, "Failed to get severities", sql, ex); throw; }
    }

    public async Task<IEnumerable<ResolutionCode>> GetResolutionCodesAsync()
    {
        string sql = "SELECT * FROM lookup.ResolutionCode ORDER BY SortOrder";
        try { using var conn = db.Create(); return await conn.QueryAsync<ResolutionCode>(sql); }
        catch (Exception ex) { SqlLogger.LogError(log, "Failed to get resolution codes", sql, ex); throw; }
    }
}
