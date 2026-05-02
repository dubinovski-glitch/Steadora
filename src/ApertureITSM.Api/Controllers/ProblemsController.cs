using ApertureITSM.Core.Interfaces;
using ApertureITSM.Features.Notifications;
using ApertureITSM.Features.Problems;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProblemsController(IProblemService service, INotificationService? notifications) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeResolved = false)
    {
        var problems = await service.GetAllAsync(includeResolved);
        return Ok(problems);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetDetail(long id)
    {
        var problem = await service.GetDetailAsync(id);
        return problem is null ? NotFound() : Ok(problem);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProblemRequest request)
    {
        var id = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetDetail), new { id }, new { id });
    }

    [HttpPatch("{id:long}/state")]
    public async Task<IActionResult> SetState(long id, [FromBody] SetStateRequest request)
    {
        await service.SetStateAsync(id, request.StateCode, request.ActorUserId);
        return NoContent();
    }

    [HttpGet("{id:long}/comments")]
    public async Task<IActionResult> GetComments(long id)
    {
        if (notifications is null) return StatusCode(503);
        return Ok(await notifications.GetCommentsAsync("PRB", id));
    }

    [HttpPost("{id:long}/comments")]
    public async Task<IActionResult> PostComment(long id, [FromBody] PostCommentRequest request)
    {
        if (notifications is null) return StatusCode(503);
        var commentId = await notifications.PostCommentAsync("PRB", id, request.AuthorExtId, request.Body, request.IsInternal);
        return Ok(new { commentId });
    }

    [HttpGet("{id:long}/timeline")]
    public async Task<IActionResult> GetTimeline(long id)
    {
        if (notifications is null) return StatusCode(503);
        return Ok(await notifications.GetTimelineAsync("PRB", id));
    }
}

public record SetStateRequest(string StateCode, int? ActorUserId);
