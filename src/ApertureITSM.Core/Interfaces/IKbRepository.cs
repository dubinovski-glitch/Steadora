using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

public interface IKbRepository
{
    Task<IEnumerable<KbArticle>> SearchAsync(string? query, int? categoryId, string? status);
    Task<KbArticle?> GetByIdAsync(long articleId);
    Task<IEnumerable<KbCategory>> GetCategoriesAsync();
    Task IncrementViewsAsync(long articleId);
    Task VoteHelpfulAsync(long articleId, bool helpful);
}
