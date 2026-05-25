-- ---------------------------------------------------------------------------
-- Fix: SlaPercent overflow in reporting.vIncidentDetail
-- Date: 2026-05-21
--
-- DECIMAL(5,1) has a max value of 9999.9. Any incident whose elapsed time
-- exceeds 100x its SLA target (e.g. a 5-min SLA open for 8+ hours = 10,000%)
-- caused Error 8115 "Arithmetic overflow converting numeric to data type numeric",
-- which propagated through vSlaBreaching and crashed usp_DashboardKpis.
-- Fixed by widening to DECIMAL(10,1) (max 999,999,999.9).
-- ---------------------------------------------------------------------------

CREATE OR ALTER VIEW reporting.vIncidentDetail AS
SELECT
    i.IncidentId,
    i.Number                    AS IncidentNumber,
    i.Title,
    p.Code                      AS Priority,
    s.Code                      AS Status,
    s.IsTerminal                AS IsTerminalStatus,
    i.OpenedAt,
    i.UpdatedAt,
    i.ResolvedAt,
    i.ClosedAt,
    i.SlaTargetMinutes,
    i.SlaStartedAt,
    i.SlaBreachedAt,
    DATEDIFF(MINUTE, i.SlaStartedAt, COALESCE(i.ResolvedAt, SYSUTCDATETIME()))
        - (i.SlaPausedSeconds / 60) AS SlaElapsedMinutes,
    CASE
        WHEN i.SlaTargetMinutes IS NULL OR i.SlaStartedAt IS NULL THEN NULL
        ELSE CAST(
            100.0 *
            (DATEDIFF(MINUTE, i.SlaStartedAt, COALESCE(i.ResolvedAt, SYSUTCDATETIME())) - (i.SlaPausedSeconds / 60))
            / NULLIF(i.SlaTargetMinutes, 0)
        AS DECIMAL(10,1))
    END AS SlaPercent,
    a.DisplayName               AS AssigneeName,
    r.DisplayName               AS ReporterName,
    g.Name                      AS GroupName,
    sv.Name                     AS ServiceName,
    ci.AssetTag                 AS CiAssetTag,
    pr.Number                   AS ParentProblemNumber
FROM itil.Incident i
LEFT JOIN lookup.Priority        p  ON p.PriorityId = i.PriorityId
LEFT JOIN lookup.IncidentStatus  s  ON s.StatusId   = i.StatusId
LEFT JOIN core.[User]            a  ON a.UserId     = i.AssigneeUserId
LEFT JOIN core.[User]            r  ON r.UserId     = i.ReporterUserId
LEFT JOIN core.[Group]           g  ON g.GroupId    = i.GroupId
LEFT JOIN core.Service           sv ON sv.ServiceId = i.ServiceId
LEFT JOIN core.ConfigurationItem ci ON ci.CiId      = i.CiId
LEFT JOIN itil.Problem           pr ON pr.ProblemId = i.ParentProblemId
WHERE i.DeletedAt IS NULL;
GO
