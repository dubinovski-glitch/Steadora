using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

public interface IAdminRepository
{
    // ── Users ────────────────────────────────────────────────────────────────
    Task<IEnumerable<User>> GetUsersAsync();
    Task<int> CreateUserAsync(string externalId, string email, string username, string displayName, string? title, byte roleId, string? passwordHash);
    Task UpdateUserAsync(int userId, string email, string username, string displayName, string? title, byte roleId, bool isActive, string? passwordHash);
    Task<IEnumerable<int>> GetUserServiceIdsAsync(int userId);
    Task SetUserServicesAsync(int userId, IEnumerable<int> serviceIds);
    Task<IEnumerable<int>> GetUserGroupIdsAsync(int userId);
    Task SetUserGroupsAsync(int userId, IEnumerable<int> groupIds);

    // ── Groups ───────────────────────────────────────────────────────────────
    Task<IEnumerable<Group>> GetGroupsAsync();
    Task<int> CreateGroupAsync(string name, string? description);
    Task UpdateGroupAsync(int groupId, string name, string? description, bool isActive);

    // ── Categories ───────────────────────────────────────────────────────────
    Task<IEnumerable<CategoryWithSubs>> GetCategoriesAsync();
    Task<int> CreateCategoryAsync(string code, string displayName, int sortOrder, int? serviceId);
    Task UpdateCategoryAsync(int categoryId, string code, string displayName, int sortOrder, int? serviceId);
    Task DeleteCategoryAsync(int categoryId);
    Task<int> CreateSubCategoryAsync(int categoryId, string code, string displayName, int sortOrder);
    Task UpdateSubCategoryAsync(int subCategoryId, int categoryId, string code, string displayName, int sortOrder);
    Task DeleteSubCategoryAsync(int subCategoryId);

    // ── Roles ────────────────────────────────────────────────────────────────
    Task<IEnumerable<Role>> GetRolesAsync();
    Task UpdateRoleAsync(byte roleId, string displayName, string? description);

    // ── Services ─────────────────────────────────────────────────────────────
    Task<IEnumerable<Service>> GetAdminServicesAsync();
    Task<int> CreateServiceAsync(string slug, string name, int? owningGroupId, string healthCode, int? slaTierId);
    Task UpdateServiceAsync(int serviceId, string name, int? owningGroupId, string healthCode, int? slaTierId, bool isActive);

    // ── SLA Tiers ────────────────────────────────────────────────────────────
    Task<IEnumerable<SlaTier>> GetSlaTiersAsync();
    Task<int> CreateSlaTierAsync(string name, string? description, bool calculate247, bool autoEscalate);
    Task UpdateSlaTierAsync(int tierId, string name, string? description, bool isActive, bool calculate247, bool autoEscalate);
    Task SaveSlaTierTargetsAsync(int tierId, IEnumerable<(byte priorityId, int responseMinutes, int resolutionMinutes)> targets);

    // ── Priority Matrix ──────────────────────────────────────────────────────
    Task<IEnumerable<PriorityMatrixRow>> GetPriorityMatrixAsync();
    Task SavePriorityMatrixAsync(IEnumerable<PriorityMatrixRow> matrix);

    // ── Business Hours ───────────────────────────────────────────────────────
    Task<IEnumerable<BusinessCalendar>> GetBusinessCalendarsAsync();
    Task<int> CreateBusinessCalendarAsync(string name, string timezone);
    Task SaveBusinessDaysAsync(int calendarId, IEnumerable<(int dayOfWeek, string? startTime, string? endTime)> days);
    Task<int> AddHolidayAsync(int calendarId, string holidayDate, string name);
    Task DeleteHolidayAsync(int holidayId);

    // ── Automations ──────────────────────────────────────────────────────────
    Task<IEnumerable<Automation>> GetAutomationsAsync();
    Task<int> CreateAutomationAsync(string name, string whenDescription, string thenDescription);
    Task UpdateAutomationAsync(int id, string name, string whenDescription, string thenDescription);
    Task ToggleAutomationAsync(int id, bool enabled);
}
