using ApertureITSM.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LookupsController(ILookupRepository repo) : ControllerBase
{
    [HttpGet("priorities")]
    public async Task<IActionResult> GetPriorities() => Ok(await repo.GetPrioritiesAsync());

    [HttpGet("incident-statuses")]
    public async Task<IActionResult> GetIncidentStatuses() => Ok(await repo.GetIncidentStatusesAsync());

    [HttpGet("problem-states")]
    public async Task<IActionResult> GetProblemStates() => Ok(await repo.GetProblemStatesAsync());

    [HttpGet("change-states")]
    public async Task<IActionResult> GetChangeStates() => Ok(await repo.GetChangeStatesAsync());

    [HttpGet("change-types")]
    public async Task<IActionResult> GetChangeTypes() => Ok(await repo.GetChangeTypesAsync());

    [HttpGet("risks")]
    public async Task<IActionResult> GetRisks() => Ok(await repo.GetRisksAsync());

    [HttpGet("impacts")]
    public async Task<IActionResult> GetImpacts() => Ok(await repo.GetImpactsAsync());

    [HttpGet("urgencies")]
    public async Task<IActionResult> GetUrgencies() => Ok(await repo.GetUrgenciesAsync());

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories() => Ok(await repo.GetCategoriesAsync());

    [HttpGet("subcategories")]
    public async Task<IActionResult> GetSubCategories([FromQuery] int categoryId)
        => Ok(await repo.GetSubCategoriesAsync(categoryId));

    [HttpGet("contact-methods")]
    public async Task<IActionResult> GetContactMethods() => Ok(await repo.GetContactMethodsAsync());

    [HttpGet("severities")]
    public async Task<IActionResult> GetSeverities() => Ok(await repo.GetSeveritiesAsync());

    [HttpGet("resolution-codes")]
    public async Task<IActionResult> GetResolutionCodes() => Ok(await repo.GetResolutionCodesAsync());
}
