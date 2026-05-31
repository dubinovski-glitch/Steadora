using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

public class AdminRepository(IDbConnectionFactory db) : IAdminRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(AdminRepository));

    // ── Users ─────────────────────────────────────────────────────────────────

    public async Task<IEnumerable<User>> GetUsersAsync()
    {
        string sql = """
            SELECT u.UserId, u.ExternalId, u.Email, u.Username, u.DisplayName, u.Title,
                   u.AvatarInitials, u.AvatarColor, u.RoleId, r.Code AS RoleCode,
                   STRING_AGG(g.Name, ', ') WITHIN GROUP (ORDER BY g.Name) AS GroupNames,
                   u.IsActive, u.CreatedAt, u.UpdatedAt
            FROM core.[User] u
            LEFT JOIN lookup.Role    r  ON r.RoleId  = u.RoleId
            LEFT JOIN core.UserGroup ug ON ug.UserId = u.UserId
            LEFT JOIN core.[Group]   g  ON g.GroupId = ug.GroupId
            GROUP BY u.UserId, u.ExternalId, u.Email, u.Username, u.DisplayName, u.Title,
                     u.AvatarInitials, u.AvatarColor, u.RoleId, r.Code, u.IsActive, u.CreatedAt, u.UpdatedAt
            ORDER BY u.DisplayName
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<User>(sql);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get users", sql, ex);
            throw;
        }
    }

    public async Task<int> CreateUserAsync(string externalId, string email, string username, string displayName, string? title, byte roleId, string? passwordHash)
    {
        string sql = """
            INSERT INTO core.[User] (ExternalId, Email, Username, DisplayName, Title, AvatarInitials, RoleId, PasswordHash, IsActive)
            VALUES (@externalId, @email, @username, @displayName, @title, @initials, @roleId, @passwordHash, 1);
            SELECT SCOPE_IDENTITY();
            """;
        try
        {
            var initials = BuildInitials(displayName);
            using var conn = db.Create();
            var id = await conn.ExecuteScalarAsync<int>(sql, new { externalId, email, username, displayName, title, initials, roleId, passwordHash });
            log.Info($"Created user '{displayName}' ({email})");
            return id;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create user '{email}'", sql, ex);
            throw;
        }
    }

    public async Task UpdateUserAsync(int userId, string email, string username, string displayName, string? title, byte roleId, bool isActive, string? passwordHash)
    {
        string sql = passwordHash != null
            ? """
              UPDATE core.[User]
              SET Email = @email, Username = @username, DisplayName = @displayName, Title = @title,
                  AvatarInitials = @initials, RoleId = @roleId,
                  IsActive = @isActive, PasswordHash = @passwordHash, UpdatedAt = SYSUTCDATETIME()
              WHERE UserId = @userId
              """
            : """
              UPDATE core.[User]
              SET Email = @email, Username = @username, DisplayName = @displayName, Title = @title,
                  AvatarInitials = @initials, RoleId = @roleId,
                  IsActive = @isActive, UpdatedAt = SYSUTCDATETIME()
              WHERE UserId = @userId
              """;
        try
        {
            var initials = BuildInitials(displayName);
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { userId, email, username, displayName, title, initials, roleId, isActive, passwordHash });
            log.Info($"Updated user {userId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update user {userId}", sql, ex);
            throw;
        }
    }

    public async Task<IEnumerable<int>> GetUserGroupIdsAsync(int userId)
    {
        string sql = "SELECT GroupId FROM core.UserGroup WHERE UserId = @userId ORDER BY GroupId";
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<int>(sql, new { userId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get groups for user {userId}", sql, ex);
            throw;
        }
    }

    public async Task SetUserGroupsAsync(int userId, IEnumerable<int> groupIds)
    {
        string sql = "DELETE FROM core.UserGroup WHERE UserId = @userId";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { userId });
            foreach (var gid in groupIds)
            {
                sql = "INSERT INTO core.UserGroup (UserId, GroupId) VALUES (@userId, @gid)";
                await conn.ExecuteAsync(sql, new { userId, gid });
            }
            log.Info($"Updated group memberships for user {userId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to set groups for user {userId}", sql, ex);
            throw;
        }
    }

    public async Task<IEnumerable<int>> GetUserServiceIdsAsync(int userId)
    {
        string sql = "SELECT ServiceId FROM core.UserService WHERE UserId = @userId";
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<int>(sql, new { userId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get services for user {userId}", sql, ex);
            throw;
        }
    }

    public async Task SetUserServicesAsync(int userId, IEnumerable<int> serviceIds)
    {
        string sql = "DELETE FROM core.UserService WHERE UserId = @userId";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { userId });
            foreach (var sid in serviceIds)
            {
                sql = "INSERT INTO core.UserService (UserId, ServiceId) VALUES (@userId, @sid)";
                await conn.ExecuteAsync(sql, new { userId, sid });
            }
            log.Info($"Updated services for user {userId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to set services for user {userId}", sql, ex);
            throw;
        }
    }

    // ── Groups ────────────────────────────────────────────────────────────────

    public async Task<IEnumerable<Group>> GetGroupsAsync()
    {
        string sql = """
            SELECT g.GroupId, g.Slug, g.Name, g.Description, g.IsActive,
                   g.CreatedAt, g.UpdatedAt,
                   COUNT(u.UserId) AS MemberCount
            FROM core.[Group] g
            LEFT JOIN core.UserGroup ug ON ug.GroupId = g.GroupId
            LEFT JOIN core.[User]    u  ON u.UserId   = ug.UserId AND u.IsActive = 1
            GROUP BY g.GroupId, g.Slug, g.Name, g.Description, g.IsActive, g.CreatedAt, g.UpdatedAt
            ORDER BY g.Name
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<Group>(sql);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get groups", sql, ex);
            throw;
        }
    }

    public async Task<int> CreateGroupAsync(string name, string? description)
    {
        string sql = """
            INSERT INTO core.[Group] (Slug, Name, Description, IsActive)
            VALUES (@slug, @name, @description, 1);
            SELECT SCOPE_IDENTITY();
            """;
        try
        {
            var slug = GenerateSlug(name);
            using var conn = db.Create();
            var id = await conn.ExecuteScalarAsync<int>(sql, new { slug, name, description });
            log.Info($"Created group '{name}' (slug: {slug})");
            return id;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create group '{name}'", sql, ex);
            throw;
        }
    }

    public async Task UpdateGroupAsync(int groupId, string name, string? description, bool isActive)
    {
        string sql = """
            UPDATE core.[Group]
            SET Name = @name, Description = @description,
                IsActive = @isActive, UpdatedAt = SYSUTCDATETIME()
            WHERE GroupId = @groupId
            """;
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { groupId, name, description, isActive });
            log.Info($"Updated group {groupId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update group {groupId}", sql, ex);
            throw;
        }
    }

    // ── Categories ────────────────────────────────────────────────────────────

    public async Task<IEnumerable<CategoryWithSubs>> GetCategoriesAsync()
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            sql = """
                SELECT c.CategoryId, c.ServiceId, s.Name AS ServiceName,
                       c.Code, c.DisplayName,
                       COUNT(i.IncidentId) AS TicketCount
                FROM lookup.Category c
                LEFT JOIN core.Service s ON s.ServiceId = c.ServiceId
                LEFT JOIN itil.Incident i ON i.CategoryId = c.CategoryId AND i.DeletedAt IS NULL
                GROUP BY c.CategoryId, c.ServiceId, s.Name, c.Code, c.DisplayName
                ORDER BY s.Name, c.DisplayName
                """;
            var cats = (await conn.QueryAsync<(int CategoryId, int? ServiceId, string? ServiceName, string Code, string DisplayName, int TicketCount)>(sql)).ToList();

            sql = "SELECT SubCategoryId, CategoryId, Code, DisplayName FROM lookup.SubCategory ORDER BY DisplayName";
            var subs = (await conn.QueryAsync<SubCategory>(sql)).ToList();

            return cats.Select(c => new CategoryWithSubs
            {
                CategoryId  = c.CategoryId,
                ServiceId   = c.ServiceId,
                ServiceName = c.ServiceName,
                Code        = c.Code,
                DisplayName = c.DisplayName,
                TicketCount = c.TicketCount,
                SubCategories = subs.Where(s => s.CategoryId == c.CategoryId).ToList()
            });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get categories", sql, ex);
            throw;
        }
    }

    public async Task<int> CreateCategoryAsync(string displayName, int? serviceId)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            var code = await MakeUniqueCodeAsync(conn, "lookup.Category", displayName);
            sql = """
                INSERT INTO lookup.Category (ServiceId, Code, DisplayName)
                VALUES (@serviceId, @code, @displayName);
                SELECT SCOPE_IDENTITY();
                """;
            var id = await conn.ExecuteScalarAsync<int>(sql, new { serviceId, code, displayName });
            log.Info($"Created category '{displayName}' (code: {code}, serviceId: {serviceId})");
            return id;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create category '{displayName}'", sql, ex);
            throw;
        }
    }

    public async Task UpdateCategoryAsync(int categoryId, string displayName, int? serviceId)
    {
        // Code is an immutable lookup key (referenced by incidents) — never changed on update.
        string sql = """
            UPDATE lookup.Category
            SET ServiceId = @serviceId, DisplayName = @displayName
            WHERE CategoryId = @categoryId
            """;
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { categoryId, serviceId, displayName });
            log.Info($"Updated category {categoryId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update category {categoryId}", sql, ex);
            throw;
        }
    }

    public async Task DeleteCategoryAsync(int categoryId)
    {
        string sql = "SELECT COUNT(*) FROM itil.Incident WHERE CategoryId = @categoryId AND DeletedAt IS NULL";
        try
        {
            using var conn = db.Create();
            var ticketCount = await conn.ExecuteScalarAsync<int>(sql, new { categoryId });

            if (ticketCount > 0)
                throw new InvalidOperationException($"Category {categoryId} has {ticketCount} open incident(s) and cannot be deleted.");

            sql = "DELETE FROM lookup.SubCategory WHERE CategoryId = @categoryId";
            await conn.ExecuteAsync(sql, new { categoryId });
            sql = "DELETE FROM lookup.Category WHERE CategoryId = @categoryId";
            await conn.ExecuteAsync(sql, new { categoryId });
            log.Info($"Deleted category {categoryId}");
        }
        catch (Exception ex) when (ex is not InvalidOperationException)
        {
            SqlLogger.LogError(log, $"Failed to delete category {categoryId}", sql, ex);
            throw;
        }
    }

    public async Task<int> CreateSubCategoryAsync(int categoryId, string displayName)
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            var code = await MakeUniqueCodeAsync(conn, "lookup.SubCategory", displayName);
            sql = """
                INSERT INTO lookup.SubCategory (CategoryId, Code, DisplayName)
                VALUES (@categoryId, @code, @displayName);
                SELECT SCOPE_IDENTITY();
                """;
            var id = await conn.ExecuteScalarAsync<int>(sql, new { categoryId, code, displayName });
            log.Info($"Created subcategory '{displayName}' under category {categoryId}");
            return id;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create subcategory under category {categoryId}", sql, ex);
            throw;
        }
    }

    public async Task UpdateSubCategoryAsync(int subCategoryId, int categoryId, string displayName)
    {
        // Code is an immutable lookup key — never changed on update.
        string sql = """
            UPDATE lookup.SubCategory
            SET CategoryId = @categoryId, DisplayName = @displayName
            WHERE SubCategoryId = @subCategoryId
            """;
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { subCategoryId, categoryId, displayName });
            log.Info($"Updated subcategory {subCategoryId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update subcategory {subCategoryId}", sql, ex);
            throw;
        }
    }

    // Generates a URL-safe, unique code (≤32 chars) from a display name.
    private static async Task<string> MakeUniqueCodeAsync(System.Data.IDbConnection conn, string table, string displayName)
    {
        var slug = System.Text.RegularExpressions.Regex
            .Replace(displayName.ToLowerInvariant(), @"[^a-z0-9]+", "-")
            .Trim('-');
        if (string.IsNullOrEmpty(slug)) slug = "item";
        if (slug.Length > 32) slug = slug[..32];

        var candidate = slug;
        var suffix = 1;
        while (await conn.ExecuteScalarAsync<int>(
                   $"SELECT COUNT(1) FROM {table} WHERE Code = @candidate", new { candidate }) > 0)
        {
            var tag = $"-{++suffix}";
            candidate = slug.Length + tag.Length > 32 ? slug[..(32 - tag.Length)] + tag : slug + tag;
        }
        return candidate;
    }

    public async Task DeleteSubCategoryAsync(int subCategoryId)
    {
        string sql = "DELETE FROM lookup.SubCategory WHERE SubCategoryId = @subCategoryId";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { subCategoryId });
            log.Info($"Deleted subcategory {subCategoryId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to delete subcategory {subCategoryId}", sql, ex);
            throw;
        }
    }

    // ── Roles ─────────────────────────────────────────────────────────────────

    public async Task<IEnumerable<Role>> GetRolesAsync()
    {
        string sql = """
            SELECT r.RoleId, r.Code, r.DisplayName, r.Description,
                   COUNT(u.UserId) AS UserCount
            FROM lookup.Role r
            LEFT JOIN core.[User] u ON u.RoleId = r.RoleId AND u.IsActive = 1
            GROUP BY r.RoleId, r.Code, r.DisplayName, r.Description
            ORDER BY r.RoleId
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<Role>(sql);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get roles", sql, ex);
            throw;
        }
    }

    public async Task UpdateRoleAsync(byte roleId, string displayName, string? description)
    {
        string sql = """
            UPDATE lookup.Role
            SET DisplayName = @displayName, Description = @description
            WHERE RoleId = @roleId
            """;
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { roleId, displayName, description });
            log.Info($"Updated role {roleId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update role {roleId}", sql, ex);
            throw;
        }
    }

    // ── Services ──────────────────────────────────────────────────────────────

    public async Task<IEnumerable<Service>> GetAdminServicesAsync()
    {
        string sql = """
            SELECT s.ServiceId, s.Slug, s.Name,
                   s.OwningGroupId, g.Name AS OwningGroupName,
                   s.HealthId, h.Code AS HealthCode,
                   s.Description, s.SlaTierId, t.Name AS SlaTierName,
                   s.IsActive,
                   COUNT(i.IncidentId) AS OpenIncidentCount
            FROM core.Service s
            LEFT JOIN core.[Group]        g ON g.GroupId    = s.OwningGroupId
            LEFT JOIN lookup.ServiceHealth h ON h.HealthId  = s.HealthId
            LEFT JOIN admin.SlaTier       t ON t.SlaTierId  = s.SlaTierId
            LEFT JOIN itil.Incident       i ON i.ServiceId  = s.ServiceId
                                            AND i.DeletedAt IS NULL
                                            AND i.ClosedAt  IS NULL
            GROUP BY s.ServiceId, s.Slug, s.Name,
                     s.OwningGroupId, g.Name, s.HealthId, h.Code,
                     s.Description, s.SlaTierId, t.Name, s.IsActive
            ORDER BY s.Name
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<Service>(sql);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get admin services", sql, ex);
            throw;
        }
    }

    public async Task<int> CreateServiceAsync(string slug, string name, int? owningGroupId, string healthCode, int? slaTierId)
    {
        string sql = """
            DECLARE @HealthId TINYINT = (SELECT HealthId FROM lookup.ServiceHealth WHERE Code = @healthCode);
            INSERT INTO core.Service (Slug, Name, OwningGroupId, HealthId, SlaTierId, IsActive)
            VALUES (@slug, @name, @owningGroupId, ISNULL(@HealthId,1), @slaTierId, 1);
            SELECT SCOPE_IDENTITY();
            """;
        try
        {
            using var conn = db.Create();
            var id = await conn.ExecuteScalarAsync<int>(sql, new { slug, name, owningGroupId, healthCode, slaTierId });
            log.Info($"Created service '{name}' (slug: {slug})");
            return id;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create service '{name}'", sql, ex);
            throw;
        }
    }

    public async Task UpdateServiceAsync(int serviceId, string name, int? owningGroupId, string healthCode, int? slaTierId, bool isActive)
    {
        string sql = """
            DECLARE @HealthId TINYINT = (SELECT HealthId FROM lookup.ServiceHealth WHERE Code = @healthCode);
            UPDATE core.Service
            SET Name = @name, OwningGroupId = @owningGroupId,
                HealthId = ISNULL(@HealthId,1), SlaTierId = @slaTierId,
                IsActive = @isActive, UpdatedAt = SYSUTCDATETIME()
            WHERE ServiceId = @serviceId
            """;
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { serviceId, name, owningGroupId, healthCode, slaTierId, isActive });
            log.Info($"Updated service {serviceId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update service {serviceId}", sql, ex);
            throw;
        }
    }

    // ── SLA Tiers ─────────────────────────────────────────────────────────────

    public async Task<IEnumerable<SlaTier>> GetSlaTiersAsync()
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            sql = """
                SELECT SlaTierId, Name, Description, IsActive, Calculate247, AutoEscalate, SortOrder
                FROM admin.SlaTier
                ORDER BY SortOrder, Name
                """;
            var tiers = (await conn.QueryAsync<SlaTier>(sql)).ToList();

            sql = """
                SELECT t.TargetId, t.SlaTierId, t.PriorityId,
                       p.Code AS PriorityCode, p.DisplayName AS PriorityDisplayName,
                       t.ResponseMinutes, t.ResolutionMinutes
                FROM admin.SlaTierTarget t
                JOIN lookup.Priority p ON p.PriorityId = t.PriorityId
                ORDER BY t.SlaTierId, p.SortOrder
                """;
            var targets = (await conn.QueryAsync<SlaTierTarget>(sql)).ToList();

            foreach (var tier in tiers)
                tier.Targets.AddRange(targets.Where(t => t.SlaTierId == tier.SlaTierId));

            return tiers;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get SLA tiers", sql, ex);
            throw;
        }
    }

    public async Task<int> CreateSlaTierAsync(string name, string? description, bool calculate247, bool autoEscalate)
    {
        string sql = """
            INSERT INTO admin.SlaTier (Name, Description, IsActive, Calculate247, AutoEscalate, SortOrder)
            VALUES (@name, @description, 1, @calculate247, @autoEscalate, 100);
            SELECT SCOPE_IDENTITY();
            """;
        try
        {
            using var conn = db.Create();
            var id = await conn.ExecuteScalarAsync<int>(sql, new { name, description, calculate247, autoEscalate });
            log.Info($"Created SLA tier '{name}'");
            return id;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create SLA tier '{name}'", sql, ex);
            throw;
        }
    }

    public async Task UpdateSlaTierAsync(int tierId, string name, string? description, bool isActive, bool calculate247, bool autoEscalate)
    {
        string sql = """
            UPDATE admin.SlaTier
            SET Name = @name, Description = @description, IsActive = @isActive,
                Calculate247 = @calculate247, AutoEscalate = @autoEscalate
            WHERE SlaTierId = @tierId
            """;
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { tierId, name, description, isActive, calculate247, autoEscalate });
            log.Info($"Updated SLA tier {tierId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update SLA tier {tierId}", sql, ex);
            throw;
        }
    }

    public async Task SaveSlaTierTargetsAsync(int tierId, IEnumerable<(byte priorityId, int responseMinutes, int resolutionMinutes)> targets)
    {
        string sql = """
            MERGE admin.SlaTierTarget AS target
            USING (SELECT @tierId AS SlaTierId, @priorityId AS PriorityId) AS src
            ON target.SlaTierId = src.SlaTierId AND target.PriorityId = src.PriorityId
            WHEN MATCHED THEN
                UPDATE SET ResponseMinutes = @responseMinutes, ResolutionMinutes = @resolutionMinutes
            WHEN NOT MATCHED THEN
                INSERT (SlaTierId, PriorityId, ResponseMinutes, ResolutionMinutes)
                VALUES (@tierId, @priorityId, @responseMinutes, @resolutionMinutes);
            """;
        try
        {
            using var conn = db.Create();
            foreach (var (priorityId, responseMinutes, resolutionMinutes) in targets)
                await conn.ExecuteAsync(sql, new { tierId, priorityId, responseMinutes, resolutionMinutes });
            log.Info($"Saved SLA tier targets for tier {tierId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to save SLA tier targets for tier {tierId}", sql, ex);
            throw;
        }
    }


    // ── Business Hours ────────────────────────────────────────────────────────

    public async Task<IEnumerable<BusinessCalendar>> GetBusinessCalendarsAsync()
    {
        string sql = "";
        try
        {
            using var conn = db.Create();
            sql = """
                SELECT CalendarId, Name, Timezone, IsDefault
                FROM admin.BusinessCalendar
                ORDER BY IsDefault DESC, Name
                """;
            var calendars = (await conn.QueryAsync<BusinessCalendar>(sql)).ToList();

            sql = """
                SELECT DayId, CalendarId, CAST(DayOfWeek AS INT) AS DayOfWeek,
                       CONVERT(VARCHAR(5), StartTime, 108) AS StartTime,
                       CONVERT(VARCHAR(5), EndTime,   108) AS EndTime
                FROM admin.BusinessDay
                ORDER BY CalendarId, DayOfWeek
                """;
            var days = (await conn.QueryAsync<BusinessDay>(sql)).ToList();

            sql = """
                SELECT HolidayId, CalendarId,
                       CONVERT(VARCHAR(10), HolidayDate, 120) AS HolidayDate,
                       Name
                FROM admin.BusinessHoliday
                ORDER BY CalendarId, HolidayDate
                """;
            var holidays = (await conn.QueryAsync<BusinessHoliday>(sql)).ToList();

            foreach (var cal in calendars)
            {
                cal.Days.AddRange(days.Where(d => d.CalendarId == cal.CalendarId));
                cal.Holidays.AddRange(holidays.Where(h => h.CalendarId == cal.CalendarId));
            }
            return calendars;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get business calendars", sql, ex);
            throw;
        }
    }

    public async Task<int> CreateBusinessCalendarAsync(string name, string timezone)
    {
        string sql = """
            INSERT INTO admin.BusinessCalendar (Name, Timezone, IsDefault)
            VALUES (@name, @timezone, 0);
            SELECT SCOPE_IDENTITY();
            """;
        try
        {
            using var conn = db.Create();
            var id = await conn.ExecuteScalarAsync<int>(sql, new { name, timezone });
            log.Info($"Created business calendar '{name}'");
            return id;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create business calendar '{name}'", sql, ex);
            throw;
        }
    }

    public async Task SaveBusinessDaysAsync(int calendarId, IEnumerable<(int dayOfWeek, string? startTime, string? endTime)> days)
    {
        string sql = """
            MERGE admin.BusinessDay AS target
            USING (SELECT @calendarId AS CalendarId, @dayOfWeek AS DayOfWeek) AS src
            ON target.CalendarId = src.CalendarId AND target.DayOfWeek = src.DayOfWeek
            WHEN MATCHED THEN
                UPDATE SET StartTime = @startTime, EndTime = @endTime
            WHEN NOT MATCHED THEN
                INSERT (CalendarId, DayOfWeek, StartTime, EndTime)
                VALUES (@calendarId, @dayOfWeek, @startTime, @endTime);
            """;
        try
        {
            using var conn = db.Create();
            foreach (var (dayOfWeek, startTime, endTime) in days)
                await conn.ExecuteAsync(sql, new { calendarId, dayOfWeek, startTime, endTime });
            log.Info($"Saved business days for calendar {calendarId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to save business days for calendar {calendarId}", sql, ex);
            throw;
        }
    }

    public async Task<int> AddHolidayAsync(int calendarId, string holidayDate, string name)
    {
        string sql = """
            INSERT INTO admin.BusinessHoliday (CalendarId, HolidayDate, Name)
            VALUES (@calendarId, @holidayDate, @name);
            SELECT SCOPE_IDENTITY();
            """;
        try
        {
            using var conn = db.Create();
            var id = await conn.ExecuteScalarAsync<int>(sql, new { calendarId, holidayDate, name });
            log.Info($"Added holiday '{name}' ({holidayDate}) to calendar {calendarId}");
            return id;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to add holiday to calendar {calendarId}", sql, ex);
            throw;
        }
    }

    public async Task DeleteHolidayAsync(int holidayId)
    {
        string sql = "DELETE FROM admin.BusinessHoliday WHERE HolidayId = @holidayId";
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { holidayId });
            log.Info($"Deleted holiday {holidayId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to delete holiday {holidayId}", sql, ex);
            throw;
        }
    }

    // ── Automations ───────────────────────────────────────────────────────────

    public async Task<IEnumerable<Automation>> GetAutomationsAsync()
    {
        string sql = """
            SELECT AutomationId, Name, WhenDescription, ThenDescription, IsEnabled, RunCount30d
            FROM admin.Automation
            ORDER BY Name
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<Automation>(sql);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get automations", sql, ex);
            throw;
        }
    }

    public async Task<int> CreateAutomationAsync(string name, string whenDescription, string thenDescription)
    {
        string sql = """
            INSERT INTO admin.Automation (Name, WhenDescription, ThenDescription, IsEnabled)
            VALUES (@name, @whenDescription, @thenDescription, 1);
            SELECT SCOPE_IDENTITY();
            """;
        try
        {
            using var conn = db.Create();
            var id = await conn.ExecuteScalarAsync<int>(sql, new { name, whenDescription, thenDescription });
            log.Info($"Created automation '{name}'");
            return id;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create automation '{name}'", sql, ex);
            throw;
        }
    }

    public async Task UpdateAutomationAsync(int id, string name, string whenDescription, string thenDescription)
    {
        string sql = """
            UPDATE admin.Automation
            SET Name = @name, WhenDescription = @whenDescription,
                ThenDescription = @thenDescription, UpdatedAt = SYSUTCDATETIME()
            WHERE AutomationId = @id
            """;
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { id, name, whenDescription, thenDescription });
            log.Info($"Updated automation {id}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update automation {id}", sql, ex);
            throw;
        }
    }

    public async Task ToggleAutomationAsync(int id, bool enabled)
    {
        string sql = """
            UPDATE admin.Automation
            SET IsEnabled = @enabled, UpdatedAt = SYSUTCDATETIME()
            WHERE AutomationId = @id
            """;
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new { id, enabled });
            log.Info($"Toggled automation {id} → {(enabled ? "enabled" : "disabled")}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to toggle automation {id}", sql, ex);
            throw;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string BuildInitials(string displayName)
    {
        var parts = displayName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length >= 2
            ? $"{parts[0][0]}{parts[^1][0]}".ToUpperInvariant()
            : displayName[..Math.Min(2, displayName.Length)].ToUpperInvariant();
    }

    private static string GenerateSlug(string name) =>
        System.Text.RegularExpressions.Regex.Replace(name.ToLowerInvariant().Replace(' ', '-'), @"[^a-z0-9\-]", "").Trim('-');
}
