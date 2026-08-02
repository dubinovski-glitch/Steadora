using ApertureITSM.Api.Services;
using ApertureITSM.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

/// <summary>
/// Manages workspaces, the unit of multi-tenant data isolation. Supports listing all workspaces,
/// listing the caller's workspaces, CRUD, and configuring a workspace's custom fields and members.
/// Mutating endpoints return the refreshed workspace so the client stays in sync.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class WorkspacesController(IWorkspaceRepository repo, ICurrentUserService currentUser) : ControllerBase
{
    /// <summary>GET api/workspaces — returns all workspaces.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await repo.GetAllAsync());

    /// <summary>GET api/workspaces/mine — returns the workspaces the authenticated caller belongs to.</summary>
    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
        => Ok(await repo.GetForUserAsync(currentUser.UserId));

    /// <summary>GET api/workspaces/{id} — returns a single workspace, or 404 if not found.</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var ws = await repo.GetByIdAsync(id);
        return ws is null ? NotFound() : Ok(ws);
    }

    /// <summary>POST api/workspaces — creates a workspace and returns 201 with the created record.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWorkspaceRequest request)
    {
        var id = await repo.CreateAsync(request);
        // Re-read so the response carries the fully materialized workspace, not just the id
        var ws = await repo.GetByIdAsync(id);
        return CreatedAtAction(nameof(GetById), new { id }, ws);
    }

    /// <summary>PUT api/workspaces/{id} — updates core workspace properties and returns the refreshed record.</summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateWorkspaceRequest request)
    {
        await repo.UpdateAsync(id, request);
        return Ok(await repo.GetByIdAsync(id));
    }

    /// <summary>PUT api/workspaces/{id}/fields — replaces the workspace's custom field configuration; returns the refreshed record.</summary>
    [HttpPut("{id:int}/fields")]
    public async Task<IActionResult> SetFields(int id, [FromBody] IEnumerable<SetWorkspaceFieldRequest> fields)
    {
        await repo.SetFieldsAsync(id, fields);
        return Ok(await repo.GetByIdAsync(id));
    }

    /// <summary>PUT api/workspaces/{id}/users — replaces the workspace's member list; returns the refreshed record.</summary>
    [HttpPut("{id:int}/users")]
    public async Task<IActionResult> SetUsers(int id, [FromBody] SetWorkspaceUsersRequest request)
    {
        await repo.SetUsersAsync(id, request.UserIds);
        return Ok(await repo.GetByIdAsync(id));
    }

    /// <summary>DELETE api/workspaces/{id} — deletes the workspace; returns 204.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await repo.DeleteAsync(id);
        return NoContent();
    }
}

/// <summary>Payload listing the user ids that should make up a workspace's membership.</summary>
public record SetWorkspaceUsersRequest(IEnumerable<int> UserIds);
