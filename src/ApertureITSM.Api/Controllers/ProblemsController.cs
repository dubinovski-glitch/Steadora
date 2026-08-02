using ApertureITSM.Core.Interfaces;
using ApertureITSM.Features.Incidents;
using ApertureITSM.Features.Notifications;
using ApertureITSM.Features.Problems;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

/// <summary>
/// REST API for problem records: listing/detail, CRUD, state transitions, linked incidents, and
/// collaboration (comments, timeline, watchers). Collaboration depends on the optional Notifications
/// feature and returns 503 when disabled. Problems use the "PRB" entity-type discriminator.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ProblemsController(
    IProblemService service,
    INotificationService? notifications,
    IIncidentService incidentService,
    ICurrentUserService currentUser,
    IUserRepository userRepository) : ControllerBase
{
    /// <summary>
    /// GET api/problems — returns a paged problem list wrapped in { items, total, page, pageSize },
    /// optionally including resolved records and restricting to the caller's groups or own assignments.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] bool includeResolved = false,
        [FromQuery] bool myGroupsOnly = false,
        [FromQuery] bool assignedToMe = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        // When "my groups only" is requested, restrict results to the caller's group memberships
        int[]? groupIds = null;
        if (myGroupsOnly && currentUser.IsAuthenticated)
            groupIds = await userRepository.GetGroupIdsAsync(currentUser.UserId);

        // When "assigned to me" is requested, restrict results to the caller's own assignments
        int? assigneeUserId = assignedToMe && currentUser.IsAuthenticated ? currentUser.UserId : null;

        var (items, total) = await service.GetAllAsync(includeResolved, groupIds, assigneeUserId, page, pageSize);
        return Ok(new { items, total, page, pageSize });
    }

    /// <summary>GET api/problems/{id} — returns the full problem detail, or 404 if not found.</summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetDetail(long id)
    {
        var problem = await service.GetDetailAsync(id);
        return problem is null ? NotFound() : Ok(problem);
    }

    /// <summary>POST api/problems — creates a problem and returns 201 with the new id.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProblemRequest request)
    {
        var id = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetDetail), new { id }, new { id });
    }

    /// <summary>PUT api/problems/{id} — replaces the problem's editable fields; returns 204.</summary>
    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateProblemRequest request)
    {
        await service.UpdateAsync(id, request);
        return NoContent();
    }

    /// <summary>
    /// PATCH api/problems/{id}/state — transitions the problem state; returns 204.
    /// The acting user is resolved from the JWT for audit logging.
    /// </summary>
    [HttpPatch("{id:long}/state")]
    public async Task<IActionResult> SetState(long id, [FromBody] SetStateRequest request)
    {
        int? actorId = currentUser.IsAuthenticated ? currentUser.UserId : (int?)null;
        await service.SetStateAsync(id, request.StateCode, actorId);
        return NoContent();
    }

    /// <summary>GET api/problems/{id}/comments — lists comments, or 503 if notifications are disabled.</summary>
    [HttpGet("{id:long}/comments")]
    public async Task<IActionResult> GetComments(long id)
    {
        if (notifications is null) return StatusCode(503);
        return Ok(await notifications.GetCommentsAsync("PRB", id));
    }

    /// <summary>POST api/problems/{id}/comments — adds a comment and returns its id, or 503 if notifications are disabled.</summary>
    [HttpPost("{id:long}/comments")]
    public async Task<IActionResult> PostComment(long id, [FromBody] PostCommentRequest request)
    {
        if (notifications is null) return StatusCode(503);
        var commentId = await notifications.PostCommentAsync("PRB", id, request.AuthorExtId, request.Body, request.IsInternal);
        return Ok(new { commentId });
    }

    /// <summary>GET api/problems/{id}/timeline — returns the audit/activity timeline, or 503 if notifications are disabled.</summary>
    [HttpGet("{id:long}/timeline")]
    public async Task<IActionResult> GetTimeline(long id)
    {
        if (notifications is null) return StatusCode(503);
        return Ok(await notifications.GetTimelineAsync("PRB", id));
    }

    /// <summary>GET api/problems/{id}/incidents — returns the incidents linked to this problem.</summary>
    [HttpGet("{id:long}/incidents")]
    public async Task<IActionResult> GetLinkedIncidents(long id)
    {
        var incidents = await incidentService.GetByProblemIdAsync(id);
        return Ok(incidents);
    }

    /// <summary>GET api/problems/{id}/watchers — lists watchers, or 503 if notifications are disabled.</summary>
    [HttpGet("{id:long}/watchers")]
    public async Task<IActionResult> GetWatchers(long id)
    {
        if (notifications is null) return StatusCode(503);
        return Ok(await notifications.GetWatchersAsync("PRB", id));
    }

    /// <summary>
    /// POST api/problems/{id}/watchers — subscribes the authenticated caller as a watcher; returns 204.
    /// Returns 503 if notifications are disabled, or 401 if unauthenticated.
    /// </summary>
    [HttpPost("{id:long}/watchers")]
    public async Task<IActionResult> Watch(long id)
    {
        if (notifications is null) return StatusCode(503);
        if (!currentUser.IsAuthenticated) return Unauthorized();
        await notifications.WatchAsync("PRB", id, currentUser.UserId);
        return NoContent();
    }

    /// <summary>
    /// DELETE api/problems/{id}/watchers — unsubscribes the authenticated caller; returns 204.
    /// Returns 503 if notifications are disabled, or 401 if unauthenticated.
    /// </summary>
    [HttpDelete("{id:long}/watchers")]
    public async Task<IActionResult> Unwatch(long id)
    {
        if (notifications is null) return StatusCode(503);
        if (!currentUser.IsAuthenticated) return Unauthorized();
        await notifications.UnwatchAsync("PRB", id, currentUser.UserId);
        return NoContent();
    }
}

/// <summary>State-transition payload: target state code plus the optional acting user id.</summary>
public record SetStateRequest(string StateCode, int? ActorUserId);
