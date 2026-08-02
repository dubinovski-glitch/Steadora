using ApertureITSM.Core.Models;

namespace ApertureITSM.Core.Interfaces;

/// <summary>
/// Provides data access for tasks, including listing by scope, creation, updates and
/// helpers for numbering and linking tasks to other records.
/// </summary>
public interface ITaskRepository
{
    /// <summary>Gets tasks of an optional type, scoped to all/mine/mygroup for the current user.</summary>
    // scope: "all" | "mine" (assignee = current user) | "mygroup" (current user's groups)
    Task<IEnumerable<TaskItem>> GetTasksAsync(string? taskType, string scope, int currentUserId);
    /// <summary>Gets a single task by its identifier, or null if not found.</summary>
    Task<TaskItem?> GetByIdAsync(long taskId);
    /// <summary>Creates a new task and returns its generated number.</summary>
    Task<string> CreateTaskAsync(CreateTaskRequest request);
    /// <summary>Updates the editable fields of an existing task.</summary>
    Task UpdateTaskAsync(long taskId, UpdateTaskRequest request);
    /// <summary>Returns the next identifier that would be assigned for a task type, without consuming it.</summary>
    // Previews the next identifier for a type (read-only display on the create form)
    Task<string> PeekNextNumberAsync(string taskType);
    /// <summary>Searches records of a given type that a task can be linked to, by number or title.</summary>
    // Search incidents/problems/changes to link a task to (by number or title)
    Task<IEnumerable<LinkableRecord>> SearchRecordsAsync(string recordType, string query);
}
