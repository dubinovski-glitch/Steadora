using log4net;
using Microsoft.Data.SqlClient;
using System.Text;

namespace ApertureITSM.Infrastructure.Database;

internal static class SqlLogger
{
    internal static void LogError(ILog log, string context, string? sql, Exception ex)
    {
        var sb = new StringBuilder(context);
        if (!string.IsNullOrWhiteSpace(sql))
        {
            var trimmed = sql.Trim();
            sb.Append(" | SQL: ").Append(trimmed.Length > 2000 ? trimmed[..2000] + " [truncated]" : trimmed);
        }
        if (ex is SqlException sqlEx)
            sb.Append($" | SqlError #{sqlEx.Number} State={sqlEx.State} Class={sqlEx.Class}");
        log.Error(sb.ToString(), ex);
    }
}
