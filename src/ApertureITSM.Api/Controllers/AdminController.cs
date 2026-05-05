using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using log4net;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(IAdminRepository repo) : ControllerBase
{
    private static readonly ILog log = LogManager.GetLogger(typeof(AdminController));

    // ── Users ──────────────────────────────────────────────────────────────

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers() =>
        Ok(await repo.GetUsersAsync());

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest req)
    {
        var hash = string.IsNullOrWhiteSpace(req.Password) ? null : ApertureITSM.Infrastructure.PasswordHelper.Hash(req.Password);
        var id = await repo.CreateUserAsync(req.ExternalId, req.Email, req.Username, req.DisplayName, req.Title, req.RoleId, hash);
        if (req.ServiceIds is { Length: > 0 })
            await repo.SetUserServicesAsync(id, req.ServiceIds);
        if (req.GroupIds is { Length: > 0 })
            await repo.SetUserGroupsAsync(id, req.GroupIds);
        return CreatedAtAction(nameof(GetUsers), new { id });
    }

    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest req)
    {
        var hash = string.IsNullOrWhiteSpace(req.Password) ? null : ApertureITSM.Infrastructure.PasswordHelper.Hash(req.Password);
        await repo.UpdateUserAsync(id, req.Email, req.Username, req.DisplayName, req.Title, req.RoleId, req.IsActive, hash);
        return NoContent();
    }

    [HttpGet("users/{id:int}/groups")]
    public async Task<IActionResult> GetUserGroups(int id) =>
        Ok(await repo.GetUserGroupIdsAsync(id));

    [HttpPut("users/{id:int}/groups")]
    public async Task<IActionResult> SetUserGroups(int id, [FromBody] int[] groupIds)
    {
        await repo.SetUserGroupsAsync(id, groupIds);
        return NoContent();
    }

    [HttpGet("users/{id:int}/services")]
    public async Task<IActionResult> GetUserServices(int id) =>
        Ok(await repo.GetUserServiceIdsAsync(id));

    [HttpPut("users/{id:int}/services")]
    public async Task<IActionResult> SetUserServices(int id, [FromBody] int[] serviceIds)
    {
        await repo.SetUserServicesAsync(id, serviceIds);
        return NoContent();
    }

    // ── Groups / Teams ─────────────────────────────────────────────────────

    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups() =>
        Ok(await repo.GetGroupsAsync());

    [HttpPost("groups")]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest req)
    {
        var id = await repo.CreateGroupAsync(req.Name, req.Description);
        return CreatedAtAction(nameof(GetGroups), new { id });
    }

    [HttpPut("groups/{id:int}")]
    public async Task<IActionResult> UpdateGroup(int id, [FromBody] UpdateGroupRequest req)
    {
        await repo.UpdateGroupAsync(id, req.Name, req.Description, req.IsActive);
        return NoContent();
    }

    // ── Categories ─────────────────────────────────────────────────────────

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories() =>
        Ok(await repo.GetCategoriesAsync());

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest req)
    {
        var id = await repo.CreateCategoryAsync(req.Code, req.DisplayName, req.SortOrder, req.ServiceId);
        return CreatedAtAction(nameof(GetCategories), new { id });
    }

    [HttpPut("categories/{id:int}")]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] UpdateCategoryRequest req)
    {
        await repo.UpdateCategoryAsync(id, req.Code, req.DisplayName, req.SortOrder, req.ServiceId);
        return NoContent();
    }

    [HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        try
        {
            await repo.DeleteCategoryAsync(id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    // ── Subcategories ──────────────────────────────────────────────────────

    [HttpPost("subcategories")]
    public async Task<IActionResult> CreateSubCategory([FromBody] CreateSubCategoryRequest req)
    {
        var id = await repo.CreateSubCategoryAsync(req.CategoryId, req.Code, req.DisplayName, req.SortOrder);
        return CreatedAtAction(nameof(GetCategories), new { id });
    }

    [HttpPut("subcategories/{id:int}")]
    public async Task<IActionResult> UpdateSubCategory(int id, [FromBody] UpdateSubCategoryRequest req)
    {
        await repo.UpdateSubCategoryAsync(id, req.CategoryId, req.Code, req.DisplayName, req.SortOrder);
        return NoContent();
    }

    [HttpDelete("subcategories/{id:int}")]
    public async Task<IActionResult> DeleteSubCategory(int id)
    {
        await repo.DeleteSubCategoryAsync(id);
        return NoContent();
    }

    // ── Roles ──────────────────────────────────────────────────────────────

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles() =>
        Ok(await repo.GetRolesAsync());

    [HttpPut("roles/{id:int}")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleRequest req)
    {
        await repo.UpdateRoleAsync((byte)id, req.DisplayName, req.Description);
        return NoContent();
    }

    // ── Services ───────────────────────────────────────────────────────────

    [HttpGet("services")]
    public async Task<IActionResult> GetServices() =>
        Ok(await repo.GetAdminServicesAsync());

    [HttpPost("services")]
    public async Task<IActionResult> CreateService([FromBody] CreateServiceRequest req)
    {
        var slug = GenerateSlug(req.Name);
        var id = await repo.CreateServiceAsync(slug, req.Name, req.OwningGroupId, req.HealthCode, req.SlaTierId);
        return CreatedAtAction(nameof(GetServices), new { id });
    }

    [HttpPut("services/{id:int}")]
    public async Task<IActionResult> UpdateService(int id, [FromBody] UpdateServiceRequest req)
    {
        await repo.UpdateServiceAsync(id, req.Name, req.OwningGroupId, req.HealthCode, req.SlaTierId, req.IsActive);
        return NoContent();
    }

    // ── SLA Tiers ──────────────────────────────────────────────────────────

    [HttpGet("sla-tiers")]
    public async Task<IActionResult> GetSlaTiers() =>
        Ok(await repo.GetSlaTiersAsync());

    [HttpPost("sla-tiers")]
    public async Task<IActionResult> CreateSlaTier([FromBody] CreateSlaTierRequest req)
    {
        var id = await repo.CreateSlaTierAsync(req.Name, req.Description, req.Calculate247, req.AutoEscalate);
        return CreatedAtAction(nameof(GetSlaTiers), new { id });
    }

    [HttpPut("sla-tiers/{id:int}")]
    public async Task<IActionResult> UpdateSlaTier(int id, [FromBody] UpdateSlaTierRequest req)
    {
        await repo.UpdateSlaTierAsync(id, req.Name, req.Description, req.IsActive, req.Calculate247, req.AutoEscalate);
        return NoContent();
    }

    [HttpPut("sla-tiers/{id:int}/targets")]
    public async Task<IActionResult> SaveSlaTierTargets(int id, [FromBody] List<SlaTierTargetRequest> targets)
    {
        await repo.SaveSlaTierTargetsAsync(id, targets.Select(t => ((byte)t.PriorityId, t.ResponseMinutes, t.ResolutionMinutes)));
        return NoContent();
    }

    // ── Priority Matrix ────────────────────────────────────────────────────

    [HttpGet("priority-matrix")]
    public async Task<IActionResult> GetPriorityMatrix() =>
        Ok(await repo.GetPriorityMatrixAsync());

    [HttpPut("priority-matrix")]
    public async Task<IActionResult> SavePriorityMatrix([FromBody] List<PriorityMatrixRowRequest> matrix)
    {
        await repo.SavePriorityMatrixAsync(matrix.Select(r => new PriorityMatrixRow((byte)r.ImpactId, (byte)r.UrgencyId, (byte)r.PriorityId)));
        return NoContent();
    }

    // ── Business Calendars ─────────────────────────────────────────────────

    [HttpGet("business-calendars")]
    public async Task<IActionResult> GetBusinessCalendars() =>
        Ok(await repo.GetBusinessCalendarsAsync());

    [HttpPost("business-calendars")]
    public async Task<IActionResult> CreateBusinessCalendar([FromBody] CreateBusinessCalendarRequest req)
    {
        var id = await repo.CreateBusinessCalendarAsync(req.Name, req.Timezone);
        return CreatedAtAction(nameof(GetBusinessCalendars), new { id });
    }

    [HttpPut("business-calendars/{id:int}/days")]
    public async Task<IActionResult> SaveBusinessDays(int id, [FromBody] List<BusinessDayRequest> days)
    {
        await repo.SaveBusinessDaysAsync(id, days.Select(d => (d.DayOfWeek, d.StartTime, d.EndTime)));
        return NoContent();
    }

    [HttpPost("business-calendars/{id:int}/holidays")]
    public async Task<IActionResult> AddHoliday(int id, [FromBody] AddHolidayRequest req)
    {
        var holidayId = await repo.AddHolidayAsync(id, req.HolidayDate, req.Name);
        return CreatedAtAction(nameof(GetBusinessCalendars), new { id = holidayId });
    }

    [HttpDelete("business-holidays/{id:int}")]
    public async Task<IActionResult> DeleteHoliday(int id)
    {
        await repo.DeleteHolidayAsync(id);
        return NoContent();
    }

    // ── Automations ────────────────────────────────────────────────────────

    [HttpGet("automations")]
    public async Task<IActionResult> GetAutomations() =>
        Ok(await repo.GetAutomationsAsync());

    [HttpPost("automations")]
    public async Task<IActionResult> CreateAutomation([FromBody] CreateAutomationRequest req)
    {
        var id = await repo.CreateAutomationAsync(req.Name, req.WhenDescription, req.ThenDescription);
        return CreatedAtAction(nameof(GetAutomations), new { id });
    }

    [HttpPut("automations/{id:int}")]
    public async Task<IActionResult> UpdateAutomation(int id, [FromBody] UpdateAutomationRequest req)
    {
        await repo.UpdateAutomationAsync(id, req.Name, req.WhenDescription, req.ThenDescription);
        return NoContent();
    }

    [HttpPatch("automations/{id:int}/toggle")]
    public async Task<IActionResult> ToggleAutomation(int id, [FromBody] ToggleAutomationRequest req)
    {
        await repo.ToggleAutomationAsync(id, req.Enabled);
        return NoContent();
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private static string GenerateSlug(string name) =>
        System.Text.RegularExpressions.Regex.Replace(name.ToLowerInvariant().Replace(' ', '-'), @"[^a-z0-9\-]", "").Trim('-');
}

// ── Request records ────────────────────────────────────────────────────────

public record CreateUserRequest(string ExternalId, string Email, string Username, string DisplayName, string? Title, byte RoleId, string? Password, int[]? ServiceIds, int[]? GroupIds);
public record UpdateUserRequest(string Email, string Username, string DisplayName, string? Title, byte RoleId, bool IsActive, string? Password);
public record CreateGroupRequest(string Name, string? Description);
public record UpdateGroupRequest(string Name, string? Description, bool IsActive);
public record CreateCategoryRequest(string Code, string DisplayName, int SortOrder, int? ServiceId);
public record UpdateCategoryRequest(string Code, string DisplayName, int SortOrder, int? ServiceId);
public record CreateSubCategoryRequest(int CategoryId, string Code, string DisplayName, int SortOrder);
public record UpdateSubCategoryRequest(int CategoryId, string Code, string DisplayName, int SortOrder);
public record UpdateRoleRequest(string DisplayName, string? Description);
public record CreateServiceRequest(string Name, int? OwningGroupId, string HealthCode, int? SlaTierId);
public record UpdateServiceRequest(string Name, int? OwningGroupId, string HealthCode, int? SlaTierId, bool IsActive);
public record CreateSlaTierRequest(string Name, string? Description, bool Calculate247, bool AutoEscalate);
public record UpdateSlaTierRequest(string Name, string? Description, bool IsActive, bool Calculate247, bool AutoEscalate);
public record SlaTierTargetRequest(int PriorityId, int ResponseMinutes, int ResolutionMinutes);
public record PriorityMatrixRowRequest(int ImpactId, int UrgencyId, int PriorityId);
public record CreateBusinessCalendarRequest(string Name, string Timezone);
public record BusinessDayRequest(int DayOfWeek, string? StartTime, string? EndTime);
public record AddHolidayRequest(string HolidayDate, string Name);
public record CreateAutomationRequest(string Name, string WhenDescription, string ThenDescription);
public record UpdateAutomationRequest(string Name, string WhenDescription, string ThenDescription);
public record ToggleAutomationRequest(bool Enabled);
