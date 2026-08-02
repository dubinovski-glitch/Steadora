using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using log4net;
using Microsoft.AspNetCore.Mvc;

namespace ApertureITSM.Api.Controllers;

/// <summary>
/// Administrative configuration API (route prefix api/admin) covering users, groups/teams,
/// categories/subcategories, roles, services, SLA tiers and targets, business calendars/holidays,
/// and automations. Create/update endpoints translate domain uniqueness/integrity violations
/// (InvalidOperationException) into HTTP 409 Conflict responses.
/// </summary>
[ApiController]
[Route("api/admin")]
public class AdminController(IAdminRepository repo) : ControllerBase
{
    private static readonly ILog log = LogManager.GetLogger(typeof(AdminController));

    // ── Users ──────────────────────────────────────────────────────────────

    /// <summary>GET api/admin/users — lists all users for administration.</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers() =>
        Ok(await repo.GetUsersAsync());

    /// <summary>
    /// POST api/admin/users — creates a user (optionally with service/group assignments) and returns 201.
    /// Returns 409 if the username/email is already taken.
    /// </summary>
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest req)
    {
        // Hash the password only when supplied; a blank password leaves the account without one
        var hash = string.IsNullOrWhiteSpace(req.Password) ? null : ApertureITSM.Infrastructure.PasswordHelper.Hash(req.Password);
        try
        {
            var id = await repo.CreateUserAsync(req.ExternalId, req.Email, req.Username, req.DisplayName, req.Title, req.RoleId, hash);
            // Persist optional many-to-many assignments only when provided
            if (req.ServiceIds is { Length: > 0 })
                await repo.SetUserServicesAsync(id, req.ServiceIds);
            if (req.GroupIds is { Length: > 0 })
                await repo.SetUserGroupsAsync(id, req.GroupIds);
            return CreatedAtAction(nameof(GetUsers), new { id });
        }
        catch (InvalidOperationException ex)
        {
            // Uniqueness/validation failure from the repository → 409 Conflict
            return Conflict(new { error = ex.Message });
        }
    }

    /// <summary>
    /// PUT api/admin/users/{id} — updates a user; returns 204, or 409 on a uniqueness conflict.
    /// A blank password leaves the existing password unchanged.
    /// </summary>
    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest req)
    {
        // Only re-hash when a new password is supplied; null means "keep the current one"
        var hash = string.IsNullOrWhiteSpace(req.Password) ? null : ApertureITSM.Infrastructure.PasswordHelper.Hash(req.Password);
        try
        {
            await repo.UpdateUserAsync(id, req.Email, req.Username, req.DisplayName, req.Title, req.RoleId, req.IsActive, hash);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    /// <summary>GET api/admin/users/{id}/groups — returns the ids of groups the user belongs to.</summary>
    [HttpGet("users/{id:int}/groups")]
    public async Task<IActionResult> GetUserGroups(int id) =>
        Ok(await repo.GetUserGroupIdsAsync(id));

    /// <summary>PUT api/admin/users/{id}/groups — replaces the user's group membership; returns 204.</summary>
    [HttpPut("users/{id:int}/groups")]
    public async Task<IActionResult> SetUserGroups(int id, [FromBody] int[] groupIds)
    {
        await repo.SetUserGroupsAsync(id, groupIds);
        return NoContent();
    }

    /// <summary>GET api/admin/users/{id}/services — returns the ids of services assigned to the user.</summary>
    [HttpGet("users/{id:int}/services")]
    public async Task<IActionResult> GetUserServices(int id) =>
        Ok(await repo.GetUserServiceIdsAsync(id));

    /// <summary>PUT api/admin/users/{id}/services — replaces the user's service assignments; returns 204.</summary>
    [HttpPut("users/{id:int}/services")]
    public async Task<IActionResult> SetUserServices(int id, [FromBody] int[] serviceIds)
    {
        await repo.SetUserServicesAsync(id, serviceIds);
        return NoContent();
    }

    // ── Groups / Teams ─────────────────────────────────────────────────────

    /// <summary>GET api/admin/groups — lists all groups/teams.</summary>
    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups() =>
        Ok(await repo.GetGroupsAsync());

    /// <summary>POST api/admin/groups — creates a group and returns 201 with the new id.</summary>
    [HttpPost("groups")]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest req)
    {
        var id = await repo.CreateGroupAsync(req.Name, req.Description);
        return CreatedAtAction(nameof(GetGroups), new { id });
    }

    /// <summary>PUT api/admin/groups/{id} — updates a group (name, description, active flag); returns 204.</summary>
    [HttpPut("groups/{id:int}")]
    public async Task<IActionResult> UpdateGroup(int id, [FromBody] UpdateGroupRequest req)
    {
        await repo.UpdateGroupAsync(id, req.Name, req.Description, req.IsActive);
        return NoContent();
    }

    // ── Categories ─────────────────────────────────────────────────────────

    /// <summary>GET api/admin/categories — lists categories (with their subcategories).</summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories() =>
        Ok(await repo.GetCategoriesAsync());

    /// <summary>POST api/admin/categories — creates a category and returns 201 with the new id.</summary>
    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest req)
    {
        var id = await repo.CreateCategoryAsync(req.DisplayName, req.ServiceId);
        return CreatedAtAction(nameof(GetCategories), new { id });
    }

    /// <summary>PUT api/admin/categories/{id} — updates a category; returns 204.</summary>
    [HttpPut("categories/{id:int}")]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] UpdateCategoryRequest req)
    {
        await repo.UpdateCategoryAsync(id, req.DisplayName, req.ServiceId);
        return NoContent();
    }

    /// <summary>
    /// DELETE api/admin/categories/{id} — deletes a category; returns 204, or 409 if it is still in use.
    /// </summary>
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
            // Category referenced by existing records → 409 Conflict
            return Conflict(new { error = ex.Message });
        }
    }

    // ── Subcategories ──────────────────────────────────────────────────────

    /// <summary>POST api/admin/subcategories — creates a subcategory under a category and returns 201.</summary>
    [HttpPost("subcategories")]
    public async Task<IActionResult> CreateSubCategory([FromBody] CreateSubCategoryRequest req)
    {
        var id = await repo.CreateSubCategoryAsync(req.CategoryId, req.DisplayName);
        return CreatedAtAction(nameof(GetCategories), new { id });
    }

    /// <summary>PUT api/admin/subcategories/{id} — updates a subcategory (parent category and name); returns 204.</summary>
    [HttpPut("subcategories/{id:int}")]
    public async Task<IActionResult> UpdateSubCategory(int id, [FromBody] UpdateSubCategoryRequest req)
    {
        await repo.UpdateSubCategoryAsync(id, req.CategoryId, req.DisplayName);
        return NoContent();
    }

    /// <summary>DELETE api/admin/subcategories/{id} — deletes a subcategory; returns 204.</summary>
    [HttpDelete("subcategories/{id:int}")]
    public async Task<IActionResult> DeleteSubCategory(int id)
    {
        await repo.DeleteSubCategoryAsync(id);
        return NoContent();
    }

    // ── Roles ──────────────────────────────────────────────────────────────

    /// <summary>GET api/admin/roles — lists the security roles.</summary>
    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles() =>
        Ok(await repo.GetRolesAsync());

    /// <summary>PUT api/admin/roles/{id} — updates a role's display name/description; returns 204.</summary>
    [HttpPut("roles/{id:int}")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleRequest req)
    {
        // Role ids are stored as a byte; the route int is narrowed accordingly
        await repo.UpdateRoleAsync((byte)id, req.DisplayName, req.Description);
        return NoContent();
    }

    // ── Services ───────────────────────────────────────────────────────────

    /// <summary>GET api/admin/services — lists services with admin-level detail.</summary>
    [HttpGet("services")]
    public async Task<IActionResult> GetServices() =>
        Ok(await repo.GetAdminServicesAsync());

    /// <summary>
    /// POST api/admin/services — creates a service (deriving a URL slug from its name) and returns 201.
    /// </summary>
    [HttpPost("services")]
    public async Task<IActionResult> CreateService([FromBody] CreateServiceRequest req)
    {
        // Derive a URL-safe slug from the display name for routing/identification
        var slug = GenerateSlug(req.Name);
        var id = await repo.CreateServiceAsync(slug, req.Name, req.OwningGroupId, req.HealthCode, req.SlaTierId);
        return CreatedAtAction(nameof(GetServices), new { id });
    }

    /// <summary>PUT api/admin/services/{id} — updates a service; returns 204.</summary>
    [HttpPut("services/{id:int}")]
    public async Task<IActionResult> UpdateService(int id, [FromBody] UpdateServiceRequest req)
    {
        await repo.UpdateServiceAsync(id, req.Name, req.OwningGroupId, req.HealthCode, req.SlaTierId, req.IsActive);
        return NoContent();
    }

    // ── SLA Tiers ──────────────────────────────────────────────────────────

    /// <summary>GET api/admin/sla-tiers — lists SLA tiers.</summary>
    [HttpGet("sla-tiers")]
    public async Task<IActionResult> GetSlaTiers() =>
        Ok(await repo.GetSlaTiersAsync());

    /// <summary>POST api/admin/sla-tiers — creates an SLA tier and returns 201 with the new id.</summary>
    [HttpPost("sla-tiers")]
    public async Task<IActionResult> CreateSlaTier([FromBody] CreateSlaTierRequest req)
    {
        var id = await repo.CreateSlaTierAsync(req.Name, req.Description, req.Calculate247, req.AutoEscalate);
        return CreatedAtAction(nameof(GetSlaTiers), new { id });
    }

    /// <summary>PUT api/admin/sla-tiers/{id} — updates an SLA tier's settings; returns 204.</summary>
    [HttpPut("sla-tiers/{id:int}")]
    public async Task<IActionResult> UpdateSlaTier(int id, [FromBody] UpdateSlaTierRequest req)
    {
        await repo.UpdateSlaTierAsync(id, req.Name, req.Description, req.IsActive, req.Calculate247, req.AutoEscalate);
        return NoContent();
    }

    /// <summary>
    /// PUT api/admin/sla-tiers/{id}/targets — replaces the tier's per-priority response/resolution
    /// targets; returns 204.
    /// </summary>
    [HttpPut("sla-tiers/{id:int}/targets")]
    public async Task<IActionResult> SaveSlaTierTargets(int id, [FromBody] List<SlaTierTargetRequest> targets)
    {
        // Project the request DTOs into the tuple shape the repository expects (priority id as byte)
        await repo.SaveSlaTierTargetsAsync(id, targets.Select(t => ((byte)t.PriorityId, t.ResponseMinutes, t.ResolutionMinutes)));
        return NoContent();
    }

    // ── Business Calendars ─────────────────────────────────────────────────

    /// <summary>GET api/admin/business-calendars — lists business calendars (working hours/holidays).</summary>
    [HttpGet("business-calendars")]
    public async Task<IActionResult> GetBusinessCalendars() =>
        Ok(await repo.GetBusinessCalendarsAsync());

    /// <summary>POST api/admin/business-calendars — creates a business calendar and returns 201.</summary>
    [HttpPost("business-calendars")]
    public async Task<IActionResult> CreateBusinessCalendar([FromBody] CreateBusinessCalendarRequest req)
    {
        var id = await repo.CreateBusinessCalendarAsync(req.Name, req.Timezone);
        return CreatedAtAction(nameof(GetBusinessCalendars), new { id });
    }

    /// <summary>
    /// PUT api/admin/business-calendars/{id}/days — replaces the calendar's weekly working hours; returns 204.
    /// </summary>
    [HttpPut("business-calendars/{id:int}/days")]
    public async Task<IActionResult> SaveBusinessDays(int id, [FromBody] List<BusinessDayRequest> days)
    {
        // Flatten each day DTO into the repository's (dayOfWeek, start, end) tuple form
        await repo.SaveBusinessDaysAsync(id, days.Select(d => (d.DayOfWeek, d.StartTime, d.EndTime)));
        return NoContent();
    }

    /// <summary>
    /// POST api/admin/business-calendars/{id}/holidays — adds a holiday to the calendar and returns 201
    /// with the new holiday id.
    /// </summary>
    [HttpPost("business-calendars/{id:int}/holidays")]
    public async Task<IActionResult> AddHoliday(int id, [FromBody] AddHolidayRequest req)
    {
        var holidayId = await repo.AddHolidayAsync(id, req.HolidayDate, req.Name);
        return CreatedAtAction(nameof(GetBusinessCalendars), new { id = holidayId });
    }

    /// <summary>DELETE api/admin/business-holidays/{id} — removes a holiday; returns 204.</summary>
    [HttpDelete("business-holidays/{id:int}")]
    public async Task<IActionResult> DeleteHoliday(int id)
    {
        await repo.DeleteHolidayAsync(id);
        return NoContent();
    }

    // ── Automations ────────────────────────────────────────────────────────

    /// <summary>GET api/admin/automations — lists configured automations (when/then rules).</summary>
    [HttpGet("automations")]
    public async Task<IActionResult> GetAutomations() =>
        Ok(await repo.GetAutomationsAsync());

    /// <summary>POST api/admin/automations — creates an automation rule and returns 201 with the new id.</summary>
    [HttpPost("automations")]
    public async Task<IActionResult> CreateAutomation([FromBody] CreateAutomationRequest req)
    {
        var id = await repo.CreateAutomationAsync(req.Name, req.WhenDescription, req.ThenDescription);
        return CreatedAtAction(nameof(GetAutomations), new { id });
    }

    /// <summary>PUT api/admin/automations/{id} — updates an automation's name and when/then text; returns 204.</summary>
    [HttpPut("automations/{id:int}")]
    public async Task<IActionResult> UpdateAutomation(int id, [FromBody] UpdateAutomationRequest req)
    {
        await repo.UpdateAutomationAsync(id, req.Name, req.WhenDescription, req.ThenDescription);
        return NoContent();
    }

    /// <summary>PATCH api/admin/automations/{id}/toggle — enables or disables an automation; returns 204.</summary>
    [HttpPatch("automations/{id:int}/toggle")]
    public async Task<IActionResult> ToggleAutomation(int id, [FromBody] ToggleAutomationRequest req)
    {
        await repo.ToggleAutomationAsync(id, req.Enabled);
        return NoContent();
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /// <summary>
    /// Builds a URL-safe slug from a display name: lowercased, spaces to hyphens, non-alphanumerics
    /// stripped, and surrounding hyphens trimmed.
    /// </summary>
    private static string GenerateSlug(string name) =>
        System.Text.RegularExpressions.Regex.Replace(name.ToLowerInvariant().Replace(' ', '-'), @"[^a-z0-9\-]", "").Trim('-');
}

// ── Request records ────────────────────────────────────────────────────────
// Strongly-typed payloads for the admin endpoints above (create/update inputs for each entity).

public record CreateUserRequest(string ExternalId, string Email, string Username, string DisplayName, string? Title, byte RoleId, string? Password, int[]? ServiceIds, int[]? GroupIds);
public record UpdateUserRequest(string Email, string Username, string DisplayName, string? Title, byte RoleId, bool IsActive, string? Password);
public record CreateGroupRequest(string Name, string? Description);
public record UpdateGroupRequest(string Name, string? Description, bool IsActive);
public record CreateCategoryRequest(string DisplayName, int? ServiceId);
public record UpdateCategoryRequest(string DisplayName, int? ServiceId);
public record CreateSubCategoryRequest(int CategoryId, string DisplayName);
public record UpdateSubCategoryRequest(int CategoryId, string DisplayName);
public record UpdateRoleRequest(string DisplayName, string? Description);
public record CreateServiceRequest(string Name, int? OwningGroupId, string HealthCode, int? SlaTierId);
public record UpdateServiceRequest(string Name, int? OwningGroupId, string HealthCode, int? SlaTierId, bool IsActive);
public record CreateSlaTierRequest(string Name, string? Description, bool Calculate247, bool AutoEscalate);
public record UpdateSlaTierRequest(string Name, string? Description, bool IsActive, bool Calculate247, bool AutoEscalate);
public record SlaTierTargetRequest(int PriorityId, int ResponseMinutes, int ResolutionMinutes);
public record CreateBusinessCalendarRequest(string Name, string Timezone);
public record BusinessDayRequest(int DayOfWeek, string? StartTime, string? EndTime);
public record AddHolidayRequest(string HolidayDate, string Name);
public record CreateAutomationRequest(string Name, string WhenDescription, string ThenDescription);
public record UpdateAutomationRequest(string Name, string WhenDescription, string ThenDescription);
public record ToggleAutomationRequest(bool Enabled);
