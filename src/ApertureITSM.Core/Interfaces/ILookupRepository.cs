using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Provides read-only access to reference/lookup data used to populate dropdowns and
/// classify records (priorities, statuses, categories and similar enumerations).
/// </summary>
public interface ILookupRepository
{
    /// <summary>Gets the available priority levels.</summary>
    Task<IEnumerable<Priority>> GetPrioritiesAsync();
    /// <summary>Gets the available incident statuses.</summary>
    Task<IEnumerable<IncidentStatus>> GetIncidentStatusesAsync();
    /// <summary>Gets the available problem states.</summary>
    Task<IEnumerable<ProblemState>> GetProblemStatesAsync();
    /// <summary>Gets the available change states.</summary>
    Task<IEnumerable<ChangeState>> GetChangeStatesAsync();
    /// <summary>Gets the available change types.</summary>
    Task<IEnumerable<ChangeType>> GetChangeTypesAsync();
    /// <summary>Gets the available risk levels.</summary>
    Task<IEnumerable<Risk>> GetRisksAsync();
    /// <summary>Gets the available impact levels.</summary>
    Task<IEnumerable<Impact>> GetImpactsAsync();
    /// <summary>Gets the available urgency levels.</summary>
    Task<IEnumerable<Urgency>> GetUrgenciesAsync();
    /// <summary>Gets the available categories.</summary>
    Task<IEnumerable<Category>> GetCategoriesAsync();
    /// <summary>Gets the subcategories belonging to a given category.</summary>
    Task<IEnumerable<SubCategory>> GetSubCategoriesAsync(int categoryId);
    /// <summary>Gets the available contact methods.</summary>
    Task<IEnumerable<ContactMethod>> GetContactMethodsAsync();
    /// <summary>Gets the available severity levels.</summary>
    Task<IEnumerable<Severity>> GetSeveritiesAsync();
    /// <summary>Gets the available resolution codes.</summary>
    Task<IEnumerable<ResolutionCode>> GetResolutionCodesAsync();
}
