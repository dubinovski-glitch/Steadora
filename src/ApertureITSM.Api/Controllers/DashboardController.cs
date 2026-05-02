using ApertureITSM.Core.Interfaces;
using ApertureITSM.Features.Incidents;
using ApertureITSM.Features.Sla;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController(
    ISlaService? slaService,
    IIncidentService? incidentService,
    IUserRepository userRepo) : ControllerBase
{
    [HttpGet("kpis")]
    public async Task<IActionResult> GetKpis([FromQuery] int days = 7)
    {
        if (slaService is null) return StatusCode(503);
        var stats = await slaService.GetDashboardStatsAsync(days);
        return Ok(stats);
    }

    [HttpGet("sla-at-risk")]
    public async Task<IActionResult> GetSlaAtRisk()
    {
        if (incidentService is null) return StatusCode(503);
        var filter = new IncidentFilter { OnlySlaAtRisk = true };
        var (items, _) = await incidentService.GetQueueAsync(filter, 1, 5);
        return Ok(items);
    }

    [HttpGet("services")]
    public async Task<IActionResult> GetServices()
    {
        var services = await userRepo.GetServicesAsync();
        return Ok(services);
    }
}
