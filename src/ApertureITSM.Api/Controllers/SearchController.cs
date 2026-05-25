using ApertureITSM.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SearchController(ISearchRepository? repository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q = "")
    {
        if (repository is null) return StatusCode(503);
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2) return Ok(Array.Empty<object>());
        var results = await repository.SearchAsync(q.Trim());
        return Ok(results);
    }
}
