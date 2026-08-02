using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Provides administrative data access for configuring the system: users, groups,
/// categories, roles, services, SLA tiers, business hours and automations.
/// </summary>
public interface IAdminRepository
{
    // ── Users ────────────────────────────────────────────────────────────────
    /// <summary>Gets all users for administration.</summary>
    Task<IEnumerable<User>> GetUsersAsync();
    /// <summary>Creates a new user and returns its identifier.</summary>
    Task<int> CreateUserAsync(string externalId, string email, string username, string displayName, string? title, byte roleId, string? passwordHash);
    /// <summary>Updates an existing user's profile, role and active status.</summary>
    Task UpdateUserAsync(int userId, string email, string username, string displayName, string? title, byte roleId, bool isActive, string? passwordHash);
    /// <summary>Gets the identifiers of the services assigned to a user.</summary>
    Task<IEnumerable<int>> GetUserServiceIdsAsync(int userId);
    /// <summary>Replaces the set of services assigned to a user.</summary>
    Task SetUserServicesAsync(int userId, IEnumerable<int> serviceIds);
    /// <summary>Gets the identifiers of the groups a user belongs to.</summary>
    Task<IEnumerable<int>> GetUserGroupIdsAsync(int userId);
    /// <summary>Replaces the set of groups a user belongs to.</summary>
    Task SetUserGroupsAsync(int userId, IEnumerable<int> groupIds);

    // ── Groups ───────────────────────────────────────────────────────────────
    /// <summary>Gets all groups for administration.</summary>
    Task<IEnumerable<Group>> GetGroupsAsync();
    /// <summary>Creates a new group and returns its identifier.</summary>
    Task<int> CreateGroupAsync(string name, string? description);
    /// <summary>Updates an existing group's details and active status.</summary>
    Task UpdateGroupAsync(int groupId, string name, string? description, bool isActive);

    // ── Categories ───────────────────────────────────────────────────────────
    /// <summary>Gets all categories with their subcategories.</summary>
    Task<IEnumerable<CategoryWithSubs>> GetCategoriesAsync();
    /// <summary>Creates a new category and returns its identifier.</summary>
    Task<int> CreateCategoryAsync(string displayName, int? serviceId);
    /// <summary>Updates an existing category's name and owning service.</summary>
    Task UpdateCategoryAsync(int categoryId, string displayName, int? serviceId);
    /// <summary>Deletes a category.</summary>
    Task DeleteCategoryAsync(int categoryId);
    /// <summary>Creates a new subcategory under a category and returns its identifier.</summary>
    Task<int> CreateSubCategoryAsync(int categoryId, string displayName);
    /// <summary>Updates an existing subcategory's name and parent category.</summary>
    Task UpdateSubCategoryAsync(int subCategoryId, int categoryId, string displayName);
    /// <summary>Deletes a subcategory.</summary>
    Task DeleteSubCategoryAsync(int subCategoryId);

    // ── Roles ────────────────────────────────────────────────────────────────
    /// <summary>Gets all roles.</summary>
    Task<IEnumerable<Role>> GetRolesAsync();
    /// <summary>Updates an existing role's display name and description.</summary>
    Task UpdateRoleAsync(byte roleId, string displayName, string? description);

    // ── Services ─────────────────────────────────────────────────────────────
    /// <summary>Gets all services for administration.</summary>
    Task<IEnumerable<Service>> GetAdminServicesAsync();
    /// <summary>Creates a new service and returns its identifier.</summary>
    Task<int> CreateServiceAsync(string slug, string name, int? owningGroupId, string healthCode, int? slaTierId);
    /// <summary>Updates an existing service's details, health and SLA tier.</summary>
    Task UpdateServiceAsync(int serviceId, string name, int? owningGroupId, string healthCode, int? slaTierId, bool isActive);

    // ── SLA Tiers ────────────────────────────────────────────────────────────
    /// <summary>Gets all SLA tiers.</summary>
    Task<IEnumerable<SlaTier>> GetSlaTiersAsync();
    /// <summary>Creates a new SLA tier and returns its identifier.</summary>
    Task<int> CreateSlaTierAsync(string name, string? description, bool calculate247, bool autoEscalate);
    /// <summary>Updates an existing SLA tier's settings.</summary>
    Task UpdateSlaTierAsync(int tierId, string name, string? description, bool isActive, bool calculate247, bool autoEscalate);
    /// <summary>Replaces the per-priority response/resolution targets for an SLA tier.</summary>
    Task SaveSlaTierTargetsAsync(int tierId, IEnumerable<(byte priorityId, int responseMinutes, int resolutionMinutes)> targets);


    // ── Business Hours ───────────────────────────────────────────────────────
    /// <summary>Gets all business calendars.</summary>
    Task<IEnumerable<BusinessCalendar>> GetBusinessCalendarsAsync();
    /// <summary>Creates a new business calendar and returns its identifier.</summary>
    Task<int> CreateBusinessCalendarAsync(string name, string timezone);
    /// <summary>Replaces the working days/hours for a business calendar.</summary>
    Task SaveBusinessDaysAsync(int calendarId, IEnumerable<(int dayOfWeek, string? startTime, string? endTime)> days);
    /// <summary>Adds a holiday to a business calendar and returns its identifier.</summary>
    Task<int> AddHolidayAsync(int calendarId, string holidayDate, string name);
    /// <summary>Deletes a holiday from a business calendar.</summary>
    Task DeleteHolidayAsync(int holidayId);

    // ── Automations ──────────────────────────────────────────────────────────
    /// <summary>Gets all automation rules.</summary>
    Task<IEnumerable<Automation>> GetAutomationsAsync();
    /// <summary>Creates a new automation rule and returns its identifier.</summary>
    Task<int> CreateAutomationAsync(string name, string whenDescription, string thenDescription);
    /// <summary>Updates an existing automation rule's name and when/then descriptions.</summary>
    Task UpdateAutomationAsync(int id, string name, string whenDescription, string thenDescription);
    /// <summary>Enables or disables an automation rule.</summary>
    Task ToggleAutomationAsync(int id, bool enabled);
}
