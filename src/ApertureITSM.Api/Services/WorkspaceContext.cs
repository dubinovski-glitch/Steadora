using ApertureITSM.Core.Interfaces;
using ApertureITSM.Infrastructure.Database;
using Dapper;

namespace ApertureITSM.Api.Services;

public class WorkspaceContext(
    IHttpContextAccessor http,
    ICurrentUserService currentUser,
    IDbConnectionFactory db) : IWorkspaceContext
{
    private int? _cached;

    public int WorkspaceId => _cached ??= Resolve();

    private int Resolve()
    {
        if (http.HttpContext is null) return 1; // Background service — use default

        var header = http.HttpContext.Request.Headers["X-Workspace-Id"].FirstOrDefault();
        if (!int.TryParse(header, out var requested) || requested <= 0) return 1;

        try
        {
            using var conn = db.Create();
            // Accept if it's the default workspace OR user is explicitly assigned to it
            var valid = conn.ExecuteScalar<int>("""
                SELECT COUNT(1) FROM core.Workspace w
                WHERE w.WorkspaceId = @requested AND w.IsActive = 1
                  AND (w.IsDefault = 1
                       OR EXISTS (
                           SELECT 1 FROM core.WorkspaceUser wu
                           WHERE wu.WorkspaceId = @requested AND wu.UserId = @userId))
                """, new { requested, userId = currentUser.UserId });

            return valid > 0 ? requested : 1;
        }
        catch { return 1; }
    }
}
