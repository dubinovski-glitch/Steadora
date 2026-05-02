namespace ApertureITSM.Core.Models;

public class KbArticle
{
    public long ArticleId { get; init; }
    public string Number { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Snippet { get; init; }
    public string? Body { get; init; }
    public int KbCategoryId { get; init; }
    public string KbCategorySlug { get; init; } = string.Empty;
    public string KbCategoryName { get; init; } = string.Empty;
    public int? AuthorUserId { get; init; }
    public string? AuthorName { get; init; }
    public string? AuthorInitials { get; init; }
    public string? AuthorColor { get; init; }
    public string Status { get; init; } = string.Empty;
    public bool Pinned { get; init; }
    public int Views { get; init; }
    public int HelpfulCount { get; init; }
    public int NotHelpfulCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public List<string> Tags { get; set; } = [];

    public decimal HelpfulPercent =>
        HelpfulCount + NotHelpfulCount == 0
            ? 0
            : Math.Round(100m * HelpfulCount / (HelpfulCount + NotHelpfulCount), 0);
}

public class KbCategory
{
    public int KbCategoryId { get; init; }
    public string Slug { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string? Icon { get; init; }
    public int SortOrder { get; init; }
    public int ArticleCount { get; init; }
}
