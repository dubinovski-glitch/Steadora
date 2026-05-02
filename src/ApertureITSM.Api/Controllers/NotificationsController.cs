using ApertureITSM.Features.Notifications;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController(INotificationService? service) : ControllerBase
{
    [HttpGet("{userId:int}/unread")]
    public async Task<IActionResult> GetUnread(int userId)
    {
        if (service is null) return StatusCode(503);
        return Ok(await service.GetUnreadAsync(userId));
    }

    [HttpPost("{userId:int}/mark-read")]
    public async Task<IActionResult> MarkRead(int userId)
    {
        if (service is null) return StatusCode(503);
        await service.MarkAllReadAsync(userId);
        return NoContent();
    }
}
