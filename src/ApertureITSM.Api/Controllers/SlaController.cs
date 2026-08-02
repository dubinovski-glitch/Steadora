using ApertureITSM.Features.Sla;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

/// <summary>
/// Reporting/analytics API for SLA and operational metrics (stats, breakdown by priority, team load,
/// daily volume). The SLA service is feature-gated, so endpoints return 503 when disabled.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SlaController(ISlaService? service) : ControllerBase
{
    /// <summary>GET api/sla/stats — aggregate SLA stats over the trailing <paramref name="days"/>, or 503 if disabled.</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] int days = 7)
    {
        if (service is null) return StatusCode(503);
        return Ok(await service.GetDashboardStatsAsync(days));
    }

    /// <summary>GET api/sla/by-priority — SLA metrics broken down by priority over the period, or 503 if disabled.</summary>
    [HttpGet("by-priority")]
    public async Task<IActionResult> GetByPriority([FromQuery] int days = 7)
    {
        if (service is null) return StatusCode(503);
        return Ok(await service.GetByPriorityAsync(days));
    }

    /// <summary>GET api/sla/team-load — current open workload per team/agent, or 503 if disabled.</summary>
    [HttpGet("team-load")]
    public async Task<IActionResult> GetTeamLoad()
    {
        if (service is null) return StatusCode(503);
        return Ok(await service.GetTeamLoadAsync());
    }

    /// <summary>GET api/sla/daily-volume — daily ticket volume over the trailing <paramref name="days"/>, or 503 if disabled.</summary>
    [HttpGet("daily-volume")]
    public async Task<IActionResult> GetDailyVolume([FromQuery] int days = 14)
    {
        if (service is null) return StatusCode(503);
        return Ok(await service.GetDailyVolumeAsync(days));
    }
}
