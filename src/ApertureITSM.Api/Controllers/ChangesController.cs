using ApertureITSM.Core.Interfaces;
using ApertureITSM.Features.Changes;
using ApertureITSM.Features.Notifications;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

/// <summary>
/// REST API for change records: listing/detail, CRUD, state transitions, CAB approval voting, and
/// comments. Comment endpoints depend on the optional Notifications feature (503 when disabled) and
/// use the "CHG" entity-type discriminator.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ChangesController(IChangeService service, INotificationService? notifications) : ControllerBase
{
    /// <summary>GET api/changes — lists changes, optionally filtered by <paramref name="state"/>.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? state)
    {
        var changes = await service.GetAllAsync(state);
        return Ok(changes);
    }

    /// <summary>GET api/changes/{id} — returns the full change detail, or 404 if not found.</summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetDetail(long id)
    {
        var change = await service.GetDetailAsync(id);
        return change is null ? NotFound() : Ok(change);
    }

    /// <summary>POST api/changes — creates a change and returns 201 with the new id.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateChangeRequest request)
    {
        var id = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetDetail), new { id }, new { id });
    }

    /// <summary>PUT api/changes/{id} — replaces the change's editable fields; returns 204.</summary>
    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateChangeRequest request)
    {
        await service.UpdateAsync(id, request);
        return NoContent();
    }

    /// <summary>PATCH api/changes/{id}/state — transitions the change state; returns 204.</summary>
    [HttpPatch("{id:long}/state")]
    public async Task<IActionResult> SetState(long id, [FromBody] SetStateRequest request)
    {
        await service.SetStateAsync(id, request.StateCode, request.ActorUserId);
        return NoContent();
    }

    /// <summary>POST api/changes/{id}/vote — records a CAB approval/rejection vote; returns 204.</summary>
    [HttpPost("{id:long}/vote")]
    public async Task<IActionResult> Vote(long id, [FromBody] VoteRequest request)
    {
        await service.VoteAsync(id, request.UserExtId, request.VoteCode, request.Comment);
        return NoContent();
    }

    /// <summary>GET api/changes/{id}/comments — lists comments, or 503 if notifications are disabled.</summary>
    [HttpGet("{id:long}/comments")]
    public async Task<IActionResult> GetComments(long id)
    {
        if (notifications is null) return StatusCode(503);
        return Ok(await notifications.GetCommentsAsync("CHG", id));
    }

    /// <summary>POST api/changes/{id}/comments — adds a comment and returns its id, or 503 if notifications are disabled.</summary>
    [HttpPost("{id:long}/comments")]
    public async Task<IActionResult> PostComment(long id, [FromBody] PostCommentRequest request)
    {
        if (notifications is null) return StatusCode(503);
        var commentId = await notifications.PostCommentAsync("CHG", id, request.AuthorExtId, request.Body, request.IsInternal);
        return Ok(new { commentId });
    }
}

/// <summary>CAB vote payload: voter external id, vote code (approve/reject), and an optional comment.</summary>
public record VoteRequest(string UserExtId, string VoteCode, string? Comment);
