using ApertureITSM.Core.Interfaces;
using ApertureITSM.Core.Models;
using ApertureITSM.Infrastructure.Database;
using Dapper;
using log4net;

namespace ApertureITSM.Infrastructure.Repositories;

/// <summary>
/// Manages work tasks (INCTASK/PRBTASK/CHGTASK/GENTASK) that hang off incidents, problems, and changes:
/// list/detail reads, create/update writes, linkable-record lookups, and next-number preview. All queries
/// are scoped to the current workspace, and numbering uses a per-type counter for gap-free sequences.
/// </summary>
public class TaskRepository(IDbConnectionFactory db, IWorkspaceContext workspace) : ITaskRepository
{
    private static readonly ILog log = LogManager.GetLogger(typeof(TaskRepository));

    // Shared SELECT projecting a task plus decoded priority/assignee/group columns; already scoped to the
    // workspace (@wid). Callers append additional filters and ORDER BY onto the trailing WHERE.
    private const string BaseSelect = """
        SELECT t.TaskId, t.Number, t.TaskType, t.Title, t.ReferenceNumber,
               t.PriorityId, pr.Code AS PriorityCode,
               t.StatusCode, t.OnHoldReason, t.DueDate,
               t.Subtype, t.PlannedStart, t.PlannedEnd,
               t.AssigneeUserId, asg.DisplayName AS AssigneeName,
               asg.AvatarInitials AS AssigneeInitials, asg.AvatarColor AS AssigneeColor,
               t.GroupId, g.Name AS GroupName,
               t.Description, t.CreatedAt, t.UpdatedAt
        FROM itil.Task t
        LEFT JOIN lookup.Priority pr  ON pr.PriorityId = t.PriorityId
        LEFT JOIN core.[User]     asg ON asg.UserId    = t.AssigneeUserId
        LEFT JOIN core.[Group]    g   ON g.GroupId      = t.GroupId
        WHERE t.WorkspaceId = @wid
        """;

    /// <summary>
    /// Returns tasks for the current workspace, optionally filtered by type and by scope: "mine"
    /// (assigned to the user), "mygroup" (owned by any of the user's groups), or all. Newest first.
    /// </summary>
    public async Task<IEnumerable<TaskItem>> GetTasksAsync(string? taskType, string scope, int currentUserId)
    {
        // Build the dynamic WHERE: optional type filter plus the scope filter (assignee vs. user's groups).
        var clauses = new List<string>();
        var p = new DynamicParameters();
        p.Add("@wid", workspace.WorkspaceId);
        if (!string.IsNullOrWhiteSpace(taskType)) { clauses.Add("t.TaskType = @taskType"); p.Add("@taskType", taskType); }
        if (scope == "mine")          { clauses.Add("t.AssigneeUserId = @uid"); p.Add("@uid", currentUserId); }
        else if (scope == "mygroup")  { clauses.Add("t.GroupId IN (SELECT GroupId FROM core.UserGroup WHERE UserId = @uid)"); p.Add("@uid", currentUserId); }

        var sql = BaseSelect
                + (clauses.Count > 0 ? " AND " + string.Join(" AND ", clauses) : string.Empty)
                + " ORDER BY t.CreatedAt DESC";
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<TaskItem>(sql, p);
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to get tasks", sql, ex);
            throw;
        }
    }

    /// <summary>Returns a single task's detail by id, scoped to the current workspace; null if not found.</summary>
    public async Task<TaskItem?> GetByIdAsync(long taskId)
    {
        var sql = BaseSelect + " AND t.TaskId = @taskId";
        try
        {
            using var conn = db.Create();
            return await conn.QueryFirstOrDefaultAsync<TaskItem>(sql, new { wid = workspace.WorkspaceId, taskId });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to get task {taskId}", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Applies a full field edit to a task (resolving the priority code to its id inline); the workspace
    /// guard in the WHERE prevents editing another workspace's task.
    /// </summary>
    public async Task UpdateTaskAsync(long taskId, UpdateTaskRequest req)
    {
        const string sql = """
            UPDATE itil.Task SET
                Title          = @Title,
                PriorityId     = (SELECT PriorityId FROM lookup.Priority WHERE Code = @PriorityCode),
                StatusCode     = @StatusCode,
                OnHoldReason   = @OnHoldReason,
                AssigneeUserId = @AssigneeUserId,
                GroupId        = @GroupId,
                DueDate        = @DueDate,
                Description    = @Description,
                ReferenceNumber= @ReferenceNumber,
                Subtype        = @Subtype,
                PlannedStart   = @PlannedStart,
                PlannedEnd     = @PlannedEnd,
                UpdatedAt      = SYSUTCDATETIME()
            WHERE TaskId = @taskId AND WorkspaceId = @wid
            """;
        try
        {
            using var conn = db.Create();
            await conn.ExecuteAsync(sql, new
            {
                taskId, wid = workspace.WorkspaceId,
                req.Title, req.PriorityCode, req.StatusCode, req.OnHoldReason,
                req.AssigneeUserId, req.GroupId, req.DueDate, req.Description,
                req.ReferenceNumber, req.Subtype, req.PlannedStart, req.PlannedEnd,
            });
            log.Info($"Updated task {taskId}");
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to update task {taskId}", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Creates a task and returns its generated number. Wraps the per-type counter bump and the insert in a
    /// transaction so the sequence stays gap-free and race-safe under concurrent creates.
    /// </summary>
    public async Task<string> CreateTaskAsync(CreateTaskRequest req)
    {
        const string insert = """
            INSERT INTO itil.Task
                (TaskType, Seq, Title, ReferenceNumber, PriorityId, StatusCode, OnHoldReason,
                 AssigneeUserId, GroupId, DueDate, Description, Subtype, PlannedStart, PlannedEnd, WorkspaceId)
            OUTPUT INSERTED.Number
            VALUES
                (@TaskType, @Seq, @Title, @ReferenceNumber,
                 (SELECT PriorityId FROM lookup.Priority WHERE Code = @PriorityCode),
                 ISNULL(@StatusCode, 'open'), @OnHoldReason,
                 @AssigneeUserId, @GroupId, @DueDate, @Description, @Subtype, @PlannedStart, @PlannedEnd, @wid)
            """;
        try
        {
            using var conn = db.Create();
            conn.Open();
            // One transaction so the counter bump + insert either both commit or both roll back.
            using var tx = conn.BeginTransaction();

            // Atomic per-type increment (row lock) → gap-free and race-safe
            await conn.ExecuteAsync("UPDATE itil.TaskCounter SET LastSeq = LastSeq + 1 WHERE TaskType = @type",
                new { type = req.TaskType }, tx);
            var seq = await conn.ExecuteScalarAsync<int>(
                "SELECT LastSeq FROM itil.TaskCounter WHERE TaskType = @type", new { type = req.TaskType }, tx);

            var number = await conn.ExecuteScalarAsync<string>(insert, new
            {
                req.TaskType, Seq = seq, req.Title, req.ReferenceNumber, req.PriorityCode,
                req.StatusCode, req.OnHoldReason,
                req.AssigneeUserId, req.GroupId, req.DueDate, req.Description,
                req.Subtype, req.PlannedStart, req.PlannedEnd, wid = workspace.WorkspaceId,
            }, tx);

            tx.Commit();
            log.Info($"Created task {number} ({req.TaskType})");
            return number!;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to create {req.TaskType} task", insert, ex);
            throw;
        }
    }

    /// <summary>
    /// Finds candidate incident/problem/change records (by number or title) that a task can reference,
    /// for the "link to record" picker, scoped to the current workspace.
    /// </summary>
    public async Task<IEnumerable<LinkableRecord>> SearchRecordsAsync(string recordType, string query)
    {
        // recordType is constrained to a fixed set → safe to interpolate the table name
        var table = recordType switch
        {
            "incident" => "itil.Incident",
            "problem"  => "itil.Problem",
            "change"   => "itil.[Change]",
            _ => null,
        };
        if (table is null) return Array.Empty<LinkableRecord>();

        var sql = $"""
            SELECT TOP 10 Number, Title
            FROM {table}
            WHERE WorkspaceId = @wid AND DeletedAt IS NULL
              AND (Number LIKE @q OR Title LIKE @q)
            ORDER BY UpdatedAt DESC
            """;
        try
        {
            using var conn = db.Create();
            return await conn.QueryAsync<LinkableRecord>(sql, new { wid = workspace.WorkspaceId, q = $"%{query}%" });
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, $"Failed to search {recordType} records", sql, ex);
            throw;
        }
    }

    /// <summary>
    /// Returns the number a task of this type would get next (typed prefix + zero-padded next sequence),
    /// without consuming the counter — used to preview the number in the create form.
    /// </summary>
    public async Task<string> PeekNextNumberAsync(string taskType)
    {
        const string sql = """
            SELECT CASE @type
                       WHEN 'incident' THEN 'INCTASK-'
                       WHEN 'problem'  THEN 'PRBTASK-'
                       WHEN 'change'   THEN 'CHGTASK-'
                       ELSE 'GENTASK-' END
                 + RIGHT('00000000' + CAST(ISNULL((SELECT LastSeq FROM itil.TaskCounter WHERE TaskType = @type), 0) + 1 AS VARCHAR(8)), 8)
            """;
        try
        {
            using var conn = db.Create();
            return await conn.ExecuteScalarAsync<string>(sql, new { type = taskType }) ?? string.Empty;
        }
        catch (Exception ex)
        {
            SqlLogger.LogError(log, "Failed to peek next task number", sql, ex);
            throw;
        }
    }
}
