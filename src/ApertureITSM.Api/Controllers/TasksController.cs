using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

/// <summary>
/// API for work tasks: querying task lists by type/scope, previewing the next generated number,
/// searching records to link against, and creating/updating individual tasks. Scope filtering and
/// list results are personalized to the authenticated caller.
/// </summary>
[ApiController]
[Route("api/tasks")]
public class TasksController(ITaskRepository repo, ICurrentUserService currentUser) : ControllerBase
{
    /// <summary>
    /// GET /api/tasks?type=incident&amp;scope=mine|mygroup|all — returns tasks filtered by type and
    /// scope, with scope evaluated against the current user.
    /// </summary>
    // GET /api/tasks?type=incident&scope=mine|mygroup|all
    [HttpGet]
    public async Task<IActionResult> GetTasks([FromQuery] string? type, [FromQuery] string scope = "all")
        => Ok(await repo.GetTasksAsync(type, scope, currentUser.UserId));

    /// <summary>GET /api/tasks/next — previews the next identifier for the given type (for the create form).</summary>
    // GET /api/tasks/next?type=incident  → previewed next identifier for the create form
    [HttpGet("next")]
    public async Task<IActionResult> NextNumber([FromQuery] string type)
        => Ok(new { number = await repo.PeekNextNumberAsync(type) });

    /// <summary>GET /api/tasks/link-search — finds records of the given type to link a task to.</summary>
    // GET /api/tasks/link-search?recordType=incident&q=wifi  → records to link a task to
    [HttpGet("link-search")]
    public async Task<IActionResult> LinkSearch([FromQuery] string recordType, [FromQuery] string q = "")
        => Ok(await repo.SearchRecordsAsync(recordType, q));

    /// <summary>GET /api/tasks/{id} — returns a single task for the detail/edit screen, or 404 if not found.</summary>
    // GET /api/tasks/{id}  → a single task for the detail/edit screen
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetTask(long id)
    {
        var task = await repo.GetByIdAsync(id);
        return task is null ? NotFound() : Ok(task);
    }

    /// <summary>
    /// POST /api/tasks — creates a task and returns its generated number. Returns 400 if the title is blank.
    /// </summary>
    // POST /api/tasks  → creates a task, returns its generated identifier
    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest req)
    {
        // Title is mandatory; reject early before hitting the repository
        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { error = "Title is required." });
        var number = await repo.CreateTaskAsync(req);
        return Ok(new { number });
    }

    /// <summary>
    /// PUT /api/tasks/{id} — updates an existing task (state, fields, etc.); returns 204.
    /// Returns 400 if the title is blank.
    /// </summary>
    // PUT /api/tasks/{id}  → update an existing task (state, fields, etc.)
    [HttpPut("{id:long}")]
    public async Task<IActionResult> UpdateTask(long id, [FromBody] UpdateTaskRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { error = "Title is required." });
        await repo.UpdateTaskAsync(id, req);
        return NoContent();
    }
}
