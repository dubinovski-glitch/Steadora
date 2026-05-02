using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using log4net;

namespace ApertureITSM.Features.KnowledgeBase;

public interface IKnowledgeService
{
    Task<IEnumerable<KbArticle>> SearchAsync(string? query, int? categoryId);
    Task<KbArticle?> GetArticleAsync(long articleId);
    Task<IEnumerable<KbCategory>> GetCategoriesAsync();
    Task TrackViewAsync(long articleId);
    Task VoteAsync(long articleId, bool helpful);
}

public class KnowledgeService(IKbRepository repository) : IKnowledgeService
{
    private static readonly ILog log = LogManager.GetLogger(typeof(KnowledgeService));

    public Task<IEnumerable<KbArticle>> SearchAsync(string? query, int? categoryId)
        => repository.SearchAsync(query, categoryId, "published");

    public async Task<KbArticle?> GetArticleAsync(long articleId)
    {
        var article = await repository.GetByIdAsync(articleId);
        if (article is not null)
            _ = repository.IncrementViewsAsync(articleId);
        return article;
    }

    public Task<IEnumerable<KbCategory>> GetCategoriesAsync()
        => repository.GetCategoriesAsync();

    public Task TrackViewAsync(long articleId)
        => repository.IncrementViewsAsync(articleId);

    public Task VoteAsync(long articleId, bool helpful)
        => repository.VoteHelpfulAsync(articleId, helpful);
}
