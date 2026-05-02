using ApertureITSM.Features.Sla;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SlaController(ISlaService? service) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] int days = 7)
    {
        if (service is null) return StatusCode(503);
        return Ok(await service.GetDashboardStatsAsync(days));
    }

    [HttpGet("by-priority")]
    public async Task<IActionResult> GetByPriority([FromQuery] int days = 7)
    {
        if (service is null) return StatusCode(503);
        return Ok(await service.GetByPriorityAsync(days));
    }

    [HttpGet("team-load")]
    public async Task<IActionResult> GetTeamLoad()
    {
        if (service is null) return StatusCode(503);
        return Ok(await service.GetTeamLoadAsync());
    }

    [HttpGet("daily-volume")]
    public async Task<IActionResult> GetDailyVolume([FromQuery] int days = 14)
    {
        if (service is null) return StatusCode(503);
        return Ok(await service.GetDailyVolumeAsync(days));
    }
}
