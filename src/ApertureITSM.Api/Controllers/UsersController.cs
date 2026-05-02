using ApertureITSM.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController(IUserRepository userRepo) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await userRepo.GetAllAsync());

    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups()
        => Ok(await userRepo.GetGroupsAsync());

    [HttpGet("configuration-items")]
    public async Task<IActionResult> GetCis()
        => Ok(await userRepo.GetConfigurationItemsAsync());
}
