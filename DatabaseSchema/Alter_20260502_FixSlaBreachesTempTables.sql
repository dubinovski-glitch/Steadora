-- Fix: reporting.usp_EvaluateSlaBreaches used OUTPUT INTO #breached / #warned
-- without first creating those temp tables, causing "Invalid object name '#breached'"
-- on every SLA background service cycle.
-- Date: 2026-05-02

CREATE OR ALTER PROCEDURE reporting.usp_EvaluateSlaBreaches
AS
/* Run every minute via SQL Agent. Marks SLA warnings (>= 80%) and breaches (>= 100%),
   creates one ActivityEvent + Notification per watcher per state change. */
BEGIN
    SET NOCOUNT ON;
    DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();

    CREATE TABLE #breached (IncidentId BIGINT NOT NULL);
    CREATE TABLE #warned   (IncidentId BIGINT NOT NULL);

    -- 1) Newly breached
    UPDATE i
    SET SlaBreachedAt = @Now,
        UpdatedAt     = @Now
    OUTPUT inserted.IncidentId INTO #breached(IncidentId)
    FROM itil.Incident i
    JOIN lookup.IncidentStatus s ON s.StatusId = i.StatusId AND s.IsTerminal = 0
    WHERE i.SlaBreachedAt IS NULL
      AND i.SlaTargetMinutes IS NOT NULL
      AND i.SlaStartedAt    IS NOT NULL
      AND DATEDIFF(MINUTE, i.SlaStartedAt, @Now) - (i.SlaPausedSeconds/60) >= i.SlaTargetMinutes;

    -- 2) Newly warned (>= 80%, < 100%)
    UPDATE i
    SET SlaWarnedAt = @Now,
        UpdatedAt   = @Now
    OUTPUT inserted.IncidentId INTO #warned(IncidentId)
    FROM itil.Incident i
    JOIN lookup.IncidentStatus s ON s.StatusId = i.StatusId AND s.IsTerminal = 0
    WHERE i.SlaWarnedAt   IS NULL
      AND i.SlaBreachedAt IS NULL
      AND i.SlaTargetMinutes IS NOT NULL
      AND i.SlaStartedAt    IS NOT NULL
      AND DATEDIFF(MINUTE, i.SlaStartedAt, @Now) - (i.SlaPausedSeconds/60)
           >= (i.SlaTargetMinutes * 80 / 100);

    INSERT INTO audit.ActivityEvent (ParentType, ParentId, Kind, OccurredAt)
    SELECT 'INC', IncidentId, 'sla_breached', @Now FROM #breached;

    INSERT INTO audit.ActivityEvent (ParentType, ParentId, Kind, OccurredAt)
    SELECT 'INC', IncidentId, 'sla_warning', @Now FROM #warned;

    INSERT INTO audit.Notification (UserId, ParentType, ParentId, Kind, Message, CreatedAt)
    SELECT w.UserId, 'INC', b.IncidentId, 'sla_breached',
           CONCAT('SLA breached on incident ',
                  (SELECT Number FROM itil.Incident WHERE IncidentId = b.IncidentId)), @Now
    FROM #breached b
    JOIN audit.Watcher w ON w.ParentType = 'INC' AND w.ParentId = b.IncidentId;
END
GO
