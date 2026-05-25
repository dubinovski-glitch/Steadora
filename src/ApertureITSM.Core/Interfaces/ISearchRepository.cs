namespace ApertureITSM.Core.Interfaces;

public class SearchResult
{
    public string Type { get; init; } = string.Empty;
    public long Id { get; init; }
    public string Number { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? StatusCode { get; init; }
    public string? PriorityCode { get; init; }
    public string? StateCode { get; init; }
}

public interface ISearchRepository
{
    Task<IEnumerable<SearchResult>> SearchAsync(string query);
}
