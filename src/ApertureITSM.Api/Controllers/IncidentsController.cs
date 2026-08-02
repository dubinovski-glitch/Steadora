using ApertureITSM.Core.Interfaces;
using ApertureITSM.Features.Incidents;
using ApertureITSM.Features.Notifications;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

/// <summary>
/// REST API for incidents: querying the queue, CRUD/state transitions (status, assignee, priority,
/// problem link, close), bulk close, and incident collaboration (comments, timeline, watchers).
/// Collaboration endpoints depend on the optional Notifications feature and return 503 when disabled.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class IncidentsController(
    IIncidentService service,
    INotificationService? notifications,
    ICurrentUserService currentUser,
    IUserRepository userRepository) : ControllerBase
{
    /// <summary>
    /// GET api/incidents — returns a paged, filtered/sorted incident queue wrapped in
    /// { items, total, page, pageSize }. Applies role-based service scoping and optional group filtering.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetQueue(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] int? assigneeUserId,
        [FromQuery] bool slaAtRisk = false,
        [FromQuery] bool unassigned = false,
        [FromQuery] bool includeResolved = false,
        [FromQuery] bool myGroupsOnly = false,
        [FromQuery] int? groupId = null,
        [FromQuery] string sortBy = "UpdatedAt",
        [FromQuery] bool sortDesc = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        // Agents and requesters with service assignments only see their services' incidents
        int[]? serviceFilter = null;
        if (currentUser.RoleCode is "agent" or "requester" && currentUser.ServiceIds.Length > 0)
            serviceFilter = currentUser.ServiceIds;

        // When "my groups only" is requested, restrict results to the caller's group memberships
        int[]? groupIds = null;
        if (myGroupsOnly && currentUser.IsAuthenticated)
            groupIds = await userRepository.GetGroupIdsAsync(currentUser.UserId);

        var filter = new IncidentFilter
        {
            Search = search,
            StatusCode = status,
            PriorityCode = priority,
            AssigneeUserId = assigneeUserId,
            OnlySlaAtRisk = slaAtRisk,
            OnlyUnassigned = unassigned,
            IncludeResolved = includeResolved,
            ServiceIds = serviceFilter,
            GroupIds = groupIds,
            GroupId = groupId,
            SortBy = sortBy,
            SortDesc = sortDesc,
        };
        var (items, total) = await service.GetQueueAsync(filter, page, pageSize);
        return Ok(new { items, total, page, pageSize });
    }

    /// <summary>GET api/incidents/{id} — returns the full incident detail, or 404 if not found.</summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetDetail(long id)
    {
        var incident = await service.GetDetailAsync(id);
        return incident is null ? NotFound() : Ok(incident);
    }

    /// <summary>POST api/incidents — creates an incident and returns 201 with the new id.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateIncidentRequest request)
    {
        var id = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetDetail), new { id }, new { id });
    }

    /// <summary>PATCH api/incidents/{id} — applies a partial field update; returns 204.</summary>
    [HttpPatch("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateIncidentRequest request)
    {
        await service.UpdateAsync(id, request);
        return NoContent();
    }

    /// <summary>
    /// PATCH api/incidents/{id}/status — transitions the incident status; returns 204.
    /// The acting user is resolved from the JWT (null when unauthenticated) for audit logging.
    /// </summary>
    [HttpPatch("{id:long}/status")]
    public async Task<IActionResult> SetStatus(long id, [FromBody] SetStatusRequest request)
    {
        // Resolve the actor from the authenticated principal so the change can be attributed
        int? actorId = currentUser.IsAuthenticated ? currentUser.UserId : (int?)null;
        await service.SetStatusAsync(id, request.StatusCode, actorId);
        return NoContent();
    }

    /// <summary>PATCH api/incidents/{id}/assignee — (re)assigns the incident; returns 204.</summary>
    [HttpPatch("{id:long}/assignee")]
    public async Task<IActionResult> Assign(long id, [FromBody] AssignRequest request)
    {
        await service.AssignAsync(id, request.AssigneeExtId, request.ActorUserId);
        return NoContent();
    }

    /// <summary>PATCH api/incidents/{id}/priority — changes the incident priority; returns 204.</summary>
    [HttpPatch("{id:long}/priority")]
    public async Task<IActionResult> SetPriority(long id, [FromBody] SetPriorityRequest request)
    {
        await service.SetPriorityAsync(id, request.PriorityCode, request.ActorUserId);
        return NoContent();
    }

    /// <summary>PATCH api/incidents/{id}/problem — links the incident to a problem record; returns 204.</summary>
    [HttpPatch("{id:long}/problem")]
    public async Task<IActionResult> LinkProblem(long id, [FromBody] LinkProblemRequest request)
    {
        await service.LinkToProblemAsync(id, request.ProblemId, request.ActorUserId);
        return NoContent();
    }

    /// <summary>
    /// DELETE api/incidents/{id} — closes the incident (soft close, not a hard delete); returns 204.
    /// The acting user is resolved from the JWT for audit purposes.
    /// </summary>
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Close(long id)
    {
        int? actorId = currentUser.IsAuthenticated ? currentUser.UserId : (int?)null;
        await service.CloseAsync(id, actorId);
        return NoContent();
    }

    /// <summary>POST api/incidents/bulk/close — closes multiple incidents in one call; returns 204.</summary>
    [HttpPost("bulk/close")]
    public async Task<IActionResult> BulkClose([FromBody] BulkCloseRequest request)
    {
        int? actorId = currentUser.IsAuthenticated ? currentUser.UserId : (int?)null;
        await service.BulkCloseAsync(request.IncidentIds, actorId);
        return NoContent();
    }

    /// <summary>GET api/incidents/{id}/comments — lists comments for the incident, or 503 if notifications are disabled.</summary>
    [HttpGet("{id:long}/comments")]
    public async Task<IActionResult> GetComments(long id)
    {
        if (notifications is null) return StatusCode(503);
        // "INC" is the entity-type discriminator shared by the notifications subsystem
        var comments = await notifications.GetCommentsAsync("INC", id);
        return Ok(comments);
    }

    /// <summary>POST api/incidents/{id}/comments — adds a comment and returns its id, or 503 if notifications are disabled.</summary>
    [HttpPost("{id:long}/comments")]
    public async Task<IActionResult> PostComment(long id, [FromBody] PostCommentRequest request)
    {
        if (notifications is null) return StatusCode(503);
        var commentId = await notifications.PostCommentAsync("INC", id, request.AuthorExtId, request.Body, request.IsInternal);
        return Ok(new { commentId });
    }

    /// <summary>GET api/incidents/{id}/timeline — returns the audit/activity timeline, or 503 if notifications are disabled.</summary>
    [HttpGet("{id:long}/timeline")]
    public async Task<IActionResult> GetTimeline(long id)
    {
        if (notifications is null) return StatusCode(503);
        var events = await notifications.GetTimelineAsync("INC", id);
        return Ok(events);
    }

    /// <summary>GET api/incidents/{id}/watchers — lists users watching the incident, or 503 if notifications are disabled.</summary>
    [HttpGet("{id:long}/watchers")]
    public async Task<IActionResult> GetWatchers(long id)
    {
        if (notifications is null) return StatusCode(503);
        var watchers = await notifications.GetWatchersAsync("INC", id);
        return Ok(watchers);
    }

    /// <summary>
    /// POST api/incidents/{id}/watchers — subscribes the authenticated caller as a watcher; returns 204.
    /// Returns 503 if notifications are disabled, or 401 if unauthenticated.
    /// </summary>
    [HttpPost("{id:long}/watchers")]
    public async Task<IActionResult> Watch(long id)
    {
        if (notifications is null) return StatusCode(503);
        if (!currentUser.IsAuthenticated) return Unauthorized();
        await notifications.WatchAsync("INC", id, currentUser.UserId);
        return NoContent();
    }

    /// <summary>
    /// DELETE api/incidents/{id}/watchers — unsubscribes the authenticated caller; returns 204.
    /// Returns 503 if notifications are disabled, or 401 if unauthenticated.
    /// </summary>
    [HttpDelete("{id:long}/watchers")]
    public async Task<IActionResult> Unwatch(long id)
    {
        if (notifications is null) return StatusCode(503);
        if (!currentUser.IsAuthenticated) return Unauthorized();
        await notifications.UnwatchAsync("INC", id, currentUser.UserId);
        return NoContent();
    }
}

// Request DTOs for incident actions; ActorUserId attributes the change to a user where applicable.
public record SetStatusRequest(string StatusCode, int? ActorUserId);
public record AssignRequest(string? AssigneeExtId, int? ActorUserId);
public record SetPriorityRequest(string PriorityCode, int? ActorUserId);
public record LinkProblemRequest(long ProblemId, int? ActorUserId);
public record BulkCloseRequest(IEnumerable<long> IncidentIds, int? ActorUserId);
public record PostCommentRequest(string AuthorExtId, string Body, bool IsInternal = false);
