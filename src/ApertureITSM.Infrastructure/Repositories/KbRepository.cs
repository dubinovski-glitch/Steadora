using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

public class KbRepository(IDbConnectionFactory db) : IKbRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(KbRepository));

    private const string BaseSelect = """
        SELECT
            a.ArticleId, a.Number, a.Title, a.Snippet, a.Body,
            a.KbCategoryId, kc.Slug AS KbCategorySlug, kc.DisplayName AS KbCategoryName,
            a.AuthorUserId, u.DisplayName AS AuthorName, u.AvatarInitials AS AuthorInitials, u.AvatarColor AS AuthorColor,
            a.Status, a.Pinned, a.Views, a.HelpfulCount, a.NotHelpfulCount,
            a.CreatedAt, a.UpdatedAt
        FROM kb.Article a
        LEFT JOIN kb.Category kc ON kc.KbCategoryId = a.KbCategoryId
        LEFT JOIN core.[User] u  ON u.UserId         = a.AuthorUserId
        WHERE a.DeletedAt IS NULL AND a.Status = 'published'
        """;

    public async Task<IEnumerable<KbArticle>> SearchAsync(string? query, int? categoryId, string? status)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            var clauses = new List<string>();
            var p = new DynamicParameters();
            if (!string.IsNullOrWhiteSpace(query)) { clauses.Add("(a.Title LIKE @q OR a.Snippet LIKE @q)"); p.Add("@q", $"%{query}%"); }
            if (categoryId.HasValue) { clauses.Add("a.KbCategoryId=@categoryId"); p.Add("@categoryId", categoryId); }
            if (!string.IsNullOrWhiteSpace(status)) { clauses.Add("a.Status=@status"); p.Add("@status", status); }
            var where = clauses.Count > 0 ? "AND " + string.Join(" AND ", clauses) : string.Empty;
            sql = $"{BaseSelect} {where} ORDER BY a.Pinned DESC, a.Views DESC";
            var articles = (await conn.QueryAsync<KbArticle>(sql, p)).ToList();
            await EnrichTagsAsync(conn, articles);
            return articles;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to search KB articles", sql, ex);
            throw;
        }
    }

    public async Task<KbArticle?> GetByIdAsync(long articleId)
    {
        string sql = $"{BaseSelect} AND a.ArticleId=@articleId";
        try
        {
            using var conn = db.Create();
            var article = await conn.QueryFirstOrDefaultAsync<KbArticle>(sql, new { articleId });
            if (article is null) return null;
            await EnrichTagsAsync(conn, [article]);
            return article;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get KB article {articleId}", sql, ex);
            throw;
        }
    }

    public async Task<IEnumerable<KbCategory>> GetCategoriesAsync()
    {
        string sql = """
            SELECT kc.*, (SELECT COUNT(*) FROM kb.Article a WHERE a.KbCategoryId=kc.KbCategoryId AND a.DeletedAt IS NULL AND a.Status='published') AS ArticleCount
            FROM kb.Category kc ORDER BY kc.SortOrder
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<KbCategory>(sql);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get KB categories", sql, ex);
            throw;
        }
    }

    public async Task IncrementViewsAsync(long articleId)
    {
        string sql = "UPDATE kb.Article SET Views=Views+1 WHERE ArticleId=@articleId";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { articleId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to increment views on article {articleId}", sql, ex);
            throw;
        }
    }

    public async Task VoteHelpfulAsync(long articleId, bool helpful)
    {
        var col = helpful ? "HelpfulCount" : "NotHelpfulCount";
        string sql = $"UPDATE kb.Article SET {col}={col}+1, UpdatedAt=SYSUTCDATETIME() WHERE ArticleId=@articleId";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { articleId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to record helpfulness vote on article {articleId}", sql, ex);
            throw;
        }
    }

    private static async Task EnrichTagsAsync(System.Data.IDbConnection conn, List<KbArticle> articles)
    {
        if (articles.Count == 0) return;
        var ids = articles.Select(a => a.ArticleId).ToArray();
        var tags = (await conn.QueryAsync<(long ArticleId, string Slug)>(
            "SELECT at2.ArticleId, t.Slug FROM kb.ArticleTag at2 JOIN kb.Tag t ON t.TagId=at2.TagId WHERE at2.ArticleId IN @ids",
            new { ids })).ToLookup(x => x.ArticleId, x => x.Slug);
        foreach (var a in articles)
            a.Tags = tags[a.ArticleId].ToList();
    }
}
