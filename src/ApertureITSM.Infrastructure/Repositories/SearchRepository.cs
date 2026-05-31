using ApertureITSM.Core.Interfaces;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

public class SearchRepository(IDbConnectionFactory db, IWorkspaceContext workspace) : ISearchRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(SearchRepository));

    public async Task<IEnumerable<SearchResult>> SearchAsync(string query)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            var like = $"%{query}%";
            sql = """
                SELECT TOP 8
                    'incident' AS Type, i.IncidentId AS Id, i.Number, i.Title,
                    st.Code AS StatusCode, pr.Code AS PriorityCode, NULL AS StateCode
                FROM itil.Incident i
                LEFT JOIN lookup.IncidentStatus st ON st.StatusId = i.StatusId
                LEFT JOIN lookup.Priority       pr ON pr.PriorityId = i.PriorityId
                WHERE i.DeletedAt IS NULL AND i.WorkspaceId = @wid
                  AND (i.Number LIKE @Like OR i.Title LIKE @Like)

                UNION ALL

                SELECT TOP 8
                    'problem' AS Type, p.ProblemId AS Id, p.Number, p.Title,
                    NULL AS StatusCode, pr.Code AS PriorityCode, st.Code AS StateCode
                FROM itil.Problem p
                LEFT JOIN lookup.Priority     pr ON pr.PriorityId = p.PriorityId
                LEFT JOIN lookup.ProblemState st ON st.StateId    = p.StateId
                WHERE p.DeletedAt IS NULL AND p.WorkspaceId = @wid
                  AND (p.Number LIKE @Like OR p.Title LIKE @Like)

                UNION ALL

                SELECT TOP 5
                    'kb' AS Type, a.ArticleId AS Id,
                    a.Number, a.Title,
                    NULL AS StatusCode, NULL AS PriorityCode, NULL AS StateCode
                FROM kb.Article a
                WHERE a.DeletedAt IS NULL AND a.Status = 'published' AND a.WorkspaceId = @wid
                  AND (a.Number LIKE @Like OR a.Title LIKE @Like)
                """;

            var wid = workspace.WorkspaceId;
            return await conn.QueryAsync<SearchResult>(sql, new { Like = like, wid });
        }
        catch (Exception ex)
        {
            log.Error($"SearchAsync failed for query '{query}': {sql}", ex);
            throw;
        }
    }
}
