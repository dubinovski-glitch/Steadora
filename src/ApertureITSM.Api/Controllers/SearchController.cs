using ApertureITSM.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

/// <summary>
/// Provides global cross-entity search (the omnibox/quick-search). The search repository is
/// feature-gated, so the endpoint returns 503 when unavailable.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SearchController(ISearchRepository? repository) : ControllerBase
{
    /// <summary>
    /// GET api/search?q= — returns matching records across entities. Returns 503 if search is disabled
    /// and an empty array for queries shorter than 2 characters (to avoid overly broad results).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q = "")
    {
        if (repository is null) return StatusCode(503);
        // Require at least 2 characters; short/blank queries short-circuit to an empty result
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2) return Ok(Array.Empty<object>());
        var results = await repository.SearchAsync(q.Trim());
        return Ok(results);
    }
}
