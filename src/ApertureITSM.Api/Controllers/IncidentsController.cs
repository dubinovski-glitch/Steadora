using ApertureITSM.Core.Interfaces;
using ApertureITSM.Features.Incidents;
using ApertureITSM.Features.Notifications;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IncidentsController(
    IIncidentService service,
    INotificationService? notifications,
    ICurrentUserService currentUser,
    IUserRepository userRepository) : ControllerBase
{
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

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetDetail(long id)
    {
        var incident = await service.GetDetailAsync(id);
        return incident is null ? NotFound() : Ok(incident);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateIncidentRequest request)
    {
        var id = await service.CreateAsync(request);
        return CreatedAtAction(nameof(GetDetail), new { id }, new { id });
    }

    [HttpPatch("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateIncidentRequest request)
    {
        await service.UpdateAsync(id, request);
        return NoContent();
    }

    [HttpPatch("{id:long}/status")]
    public async Task<IActionResult> SetStatus(long id, [FromBody] SetStatusRequest request)
    {
        int? actorId = currentUser.IsAuthenticated ? currentUser.UserId : (int?)null;
        await service.SetStatusAsync(id, request.StatusCode, actorId);
        return NoContent();
    }

    [HttpPatch("{id:long}/assignee")]
    public async Task<IActionResult> Assign(long id, [FromBody] AssignRequest request)
    {
        await service.AssignAsync(id, request.AssigneeExtId, request.ActorUserId);
        return NoContent();
    }

    [HttpPatch("{id:long}/priority")]
    public async Task<IActionResult> SetPriority(long id, [FromBody] SetPriorityRequest request)
    {
        await service.SetPriorityAsync(id, request.PriorityCode, request.ActorUserId);
        return NoContent();
    }

    [HttpPatch("{id:long}/problem")]
    public async Task<IActionResult> LinkProblem(long id, [FromBody] LinkProblemRequest request)
    {
        await service.LinkToProblemAsync(id, request.ProblemId, request.ActorUserId);
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Close(long id)
    {
        int? actorId = currentUser.IsAuthenticated ? currentUser.UserId : (int?)null;
        await service.CloseAsync(id, actorId);
        return NoContent();
    }

    [HttpPost("bulk/close")]
    public async Task<IActionResult> BulkClose([FromBody] BulkCloseRequest request)
    {
        int? actorId = currentUser.IsAuthenticated ? currentUser.UserId : (int?)null;
        await service.BulkCloseAsync(request.IncidentIds, actorId);
        return NoContent();
    }

    [HttpGet("{id:long}/comments")]
    public async Task<IActionResult> GetComments(long id)
    {
        if (notifications is null) return StatusCode(503);
        var comments = await notifications.GetCommentsAsync("INC", id);
        return Ok(comments);
    }

    [HttpPost("{id:long}/comments")]
    public async Task<IActionResult> PostComment(long id, [FromBody] PostCommentRequest request)
    {
        if (notifications is null) return StatusCode(503);
        var commentId = await notifications.PostCommentAsync("INC", id, request.AuthorExtId, request.Body, request.IsInternal);
        return Ok(new { commentId });
    }

    [HttpGet("{id:long}/timeline")]
    public async Task<IActionResult> GetTimeline(long id)
    {
        if (notifications is null) return StatusCode(503);
        var events = await notifications.GetTimelineAsync("INC", id);
        return Ok(events);
    }

    [HttpGet("{id:long}/watchers")]
    public async Task<IActionResult> GetWatchers(long id)
    {
        if (notifications is null) return StatusCode(503);
        var watchers = await notifications.GetWatchersAsync("INC", id);
        return Ok(watchers);
    }
}

public record SetStatusRequest(string StatusCode, int? ActorUserId);
public record AssignRequest(string? AssigneeExtId, int? ActorUserId);
public record SetPriorityRequest(string PriorityCode, int? ActorUserId);
public record LinkProblemRequest(long ProblemId, int? ActorUserId);
public record BulkCloseRequest(IEnumerable<long> IncidentIds, int? ActorUserId);
public record PostCommentRequest(string AuthorExtId, string Body, bool IsInternal = false);
