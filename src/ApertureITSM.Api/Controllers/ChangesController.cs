using ApertureITSM.Core.Interfaces;
using ApertureITSM.Features.Changes;
using ApertureITSM.Features.Notifications;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChangesController(IChangeService service, INotificationService? notifications) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? state)
    {
        var changes = await service.GetAllAsync(state);
        return Ok(changes);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetDetail(long id)
    {
        var change = await service.GetDetailAsync(id);
        return change is null ? NotFound() : Ok(change);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateChangeRequest request)
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

    [HttpPost("{id:long}/vote")]
    public async Task<IActionResult> Vote(long id, [FromBody] VoteRequest request)
    {
        await service.VoteAsync(id, request.UserExtId, request.VoteCode, request.Comment);
        return NoContent();
    }

    [HttpGet("{id:long}/comments")]
    public async Task<IActionResult> GetComments(long id)
    {
        if (notifications is null) return StatusCode(503);
        return Ok(await notifications.GetCommentsAsync("CHG", id));
    }

    [HttpPost("{id:long}/comments")]
    public async Task<IActionResult> PostComment(long id, [FromBody] PostCommentRequest request)
    {
        if (notifications is null) return StatusCode(503);
        var commentId = await notifications.PostCommentAsync("CHG", id, request.AuthorExtId, request.Body, request.IsInternal);
        return Ok(new { commentId });
    }
}

public record VoteRequest(string UserExtId, string VoteCode, string? Comment);
