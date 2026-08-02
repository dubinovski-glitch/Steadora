using ApertureITSM.Core.Interfaces;
using ApertureITSM.Features.Incidents;
using ApertureITSM.Features.Sla;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

/// <summary>
/// Serves the home dashboard: aggregate SLA KPIs, SLA-at-risk incidents and the service catalog.
/// SLA and incident services are optional (feature-gated), so endpoints return 503 when disabled.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class DashboardController(
    ISlaService? slaService,
    IIncidentService? incidentService,
    IUserRepository userRepo) : ControllerBase
{
    /// <summary>
    /// GET api/dashboard/kpis — returns SLA dashboard statistics for the trailing <paramref name="days"/>,
    /// or 503 if the SLA feature is disabled.
    /// </summary>
    [HttpGet("kpis")]
    public async Task<IActionResult> GetKpis([FromQuery] int days = 7)
    {
        if (slaService is null) return StatusCode(503);
        var stats = await slaService.GetDashboardStatsAsync(days);
        return Ok(stats);
    }

    /// <summary>
    /// GET api/dashboard/sla-at-risk — returns the top 5 incidents whose SLA is at risk,
    /// or 503 if the Incidents feature is disabled.
    /// </summary>
    [HttpGet("sla-at-risk")]
    public async Task<IActionResult> GetSlaAtRisk()
    {
        if (incidentService is null) return StatusCode(503);
        // Build a queue filter limited to at-risk incidents and take only the first page of 5
        var filter = new IncidentFilter { OnlySlaAtRisk = true };
        var (items, _) = await incidentService.GetQueueAsync(filter, 1, 5);
        return Ok(items);
    }

    /// <summary>GET api/dashboard/services — returns the service catalog used by dashboard widgets.</summary>
    [HttpGet("services")]
    public async Task<IActionResult> GetServices()
    {
        var services = await userRepo.GetServicesAsync();
        return Ok(services);
    }
}
