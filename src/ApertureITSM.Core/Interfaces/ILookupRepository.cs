using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

public interface ILookupRepository
{
    Task<IEnumerable<Priority>> GetPrioritiesAsync();
    Task<IEnumerable<IncidentStatus>> GetIncidentStatusesAsync();
    Task<IEnumerable<ProblemState>> GetProblemStatesAsync();
    Task<IEnumerable<ChangeState>> GetChangeStatesAsync();
    Task<IEnumerable<ChangeType>> GetChangeTypesAsync();
    Task<IEnumerable<Risk>> GetRisksAsync();
    Task<IEnumerable<Impact>> GetImpactsAsync();
    Task<IEnumerable<Urgency>> GetUrgenciesAsync();
    Task<IEnumerable<Category>> GetCategoriesAsync();
}
