using ApertureITSM.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

/// <summary>
/// Read-only directory API exposing users, groups/teams and configuration items (CIs) for use in
/// pickers and assignment dropdowns.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UsersController(IUserRepository userRepo) : ControllerBase
{
    /// <summary>
    /// GET api/users — returns all users, or only members of a group when <paramref name="groupSlug"/>
    /// is supplied.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? groupSlug = null)
    {
        // Narrow to a single group's members when a slug is provided; otherwise return everyone
        if (!string.IsNullOrEmpty(groupSlug))
            return Ok(await userRepo.GetByGroupSlugAsync(groupSlug));
        return Ok(await userRepo.GetAllAsync());
    }

    /// <summary>GET api/users/groups — returns all groups/teams.</summary>
    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups()
        => Ok(await userRepo.GetGroupsAsync());

    /// <summary>GET api/users/configuration-items — returns the CMDB configuration items.</summary>
    [HttpGet("configuration-items")]
    public async Task<IActionResult> GetCis()
        => Ok(await userRepo.GetConfigurationItemsAsync());
}
