using ApertureITSM.Api.Services;
using ApertureITSM.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkspacesController(IWorkspaceRepository repo, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await repo.GetAllAsync());

    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
        => Ok(await repo.GetForUserAsync(currentUser.UserId));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var ws = await repo.GetByIdAsync(id);
        return ws is null ? NotFound() : Ok(ws);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWorkspaceRequest request)
    {
        var id = await repo.CreateAsync(request);
        var ws = await repo.GetByIdAsync(id);
        return CreatedAtAction(nameof(GetById), new { id }, ws);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateWorkspaceRequest request)
    {
        await repo.UpdateAsync(id, request);
        return Ok(await repo.GetByIdAsync(id));
    }

    [HttpPut("{id:int}/fields")]
    public async Task<IActionResult> SetFields(int id, [FromBody] IEnumerable<SetWorkspaceFieldRequest> fields)
    {
        await repo.SetFieldsAsync(id, fields);
        return Ok(await repo.GetByIdAsync(id));
    }

    [HttpPut("{id:int}/users")]
    public async Task<IActionResult> SetUsers(int id, [FromBody] SetWorkspaceUsersRequest request)
    {
        await repo.SetUsersAsync(id, request.UserIds);
        return Ok(await repo.GetByIdAsync(id));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await repo.DeleteAsync(id);
        return NoContent();
    }
}

public record SetWorkspaceUsersRequest(IEnumerable<int> UserIds);
