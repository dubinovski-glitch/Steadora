using ApertureITSM.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

/// <summary>
/// Exposes read-only reference/lookup data (priorities, statuses, categories, risks, etc.) used to
/// populate dropdowns and labels across the UI. Each GET returns the corresponding lookup list.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class LookupsController(ILookupRepository repo) : ControllerBase
{
    /// <summary>GET api/lookups/priorities — incident/request priority options.</summary>
    [HttpGet("priorities")]
    public async Task<IActionResult> GetPriorities() => Ok(await repo.GetPrioritiesAsync());

    /// <summary>GET api/lookups/incident-statuses — incident status options.</summary>
    [HttpGet("incident-statuses")]
    public async Task<IActionResult> GetIncidentStatuses() => Ok(await repo.GetIncidentStatusesAsync());

    /// <summary>GET api/lookups/problem-states — problem lifecycle states.</summary>
    [HttpGet("problem-states")]
    public async Task<IActionResult> GetProblemStates() => Ok(await repo.GetProblemStatesAsync());

    /// <summary>GET api/lookups/change-states — change lifecycle states.</summary>
    [HttpGet("change-states")]
    public async Task<IActionResult> GetChangeStates() => Ok(await repo.GetChangeStatesAsync());

    /// <summary>GET api/lookups/change-types — change type options (standard/normal/emergency, etc.).</summary>
    [HttpGet("change-types")]
    public async Task<IActionResult> GetChangeTypes() => Ok(await repo.GetChangeTypesAsync());

    /// <summary>GET api/lookups/risks — risk level options.</summary>
    [HttpGet("risks")]
    public async Task<IActionResult> GetRisks() => Ok(await repo.GetRisksAsync());

    /// <summary>GET api/lookups/impacts — impact level options.</summary>
    [HttpGet("impacts")]
    public async Task<IActionResult> GetImpacts() => Ok(await repo.GetImpactsAsync());

    /// <summary>GET api/lookups/urgencies — urgency level options.</summary>
    [HttpGet("urgencies")]
    public async Task<IActionResult> GetUrgencies() => Ok(await repo.GetUrgenciesAsync());

    /// <summary>GET api/lookups/categories — top-level categorization options.</summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories() => Ok(await repo.GetCategoriesAsync());

    /// <summary>GET api/lookups/subcategories — subcategories filtered by the given categoryId.</summary>
    [HttpGet("subcategories")]
    public async Task<IActionResult> GetSubCategories([FromQuery] int categoryId)
        => Ok(await repo.GetSubCategoriesAsync(categoryId));

    /// <summary>GET api/lookups/contact-methods — available requester contact methods.</summary>
    [HttpGet("contact-methods")]
    public async Task<IActionResult> GetContactMethods() => Ok(await repo.GetContactMethodsAsync());

    /// <summary>GET api/lookups/severities — severity level options.</summary>
    [HttpGet("severities")]
    public async Task<IActionResult> GetSeverities() => Ok(await repo.GetSeveritiesAsync());

    /// <summary>GET api/lookups/resolution-codes — resolution code options used when closing records.</summary>
    [HttpGet("resolution-codes")]
    public async Task<IActionResult> GetResolutionCodes() => Ok(await repo.GetResolutionCodesAsync());
}
