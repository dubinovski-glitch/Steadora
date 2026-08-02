using ApertureITSM.Features.Notifications;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

/// <summary>
/// API for per-user in-app notifications. The notification service is feature-gated, so endpoints
/// return 503 when the feature is disabled.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class NotificationsController(INotificationService? service) : ControllerBase
{
    /// <summary>GET api/notifications/{userId}/unread — returns the user's unread notifications, or 503 if disabled.</summary>
    [HttpGet("{userId:int}/unread")]
    public async Task<IActionResult> GetUnread(int userId)
    {
        if (service is null) return StatusCode(503);
        return Ok(await service.GetUnreadAsync(userId));
    }

    /// <summary>POST api/notifications/{userId}/mark-read — marks all of the user's notifications read; returns 204, or 503 if disabled.</summary>
    [HttpPost("{userId:int}/mark-read")]
    public async Task<IActionResult> MarkRead(int userId)
    {
        if (service is null) return StatusCode(503);
        await service.MarkAllReadAsync(userId);
        return NoContent();
    }
}
