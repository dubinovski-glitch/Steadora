namespace ApertureITSM.Core.Interfaces;

/// <summary>A single global-search hit referencing an ITSM record (incident, problem, change, etc.).</summary>
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

/// <summary>Provides global, cross-entity search across ITSM records.</summary>
public interface ISearchRepository
{
    /// <summary>Searches across record types and returns matching results for the given query.</summary>
    Task<IEnumerable<SearchResult>> SearchAsync(string query);
}
