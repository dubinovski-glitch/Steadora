-- Workspace isolation: add WorkspaceId to all ITIL entity tables.
-- Existing records are assigned to workspace 1 (Default Workspace).

ALTER TABLE itil.Incident  ADD WorkspaceId INT NOT NULL CONSTRAINT DF_Incident_WS  DEFAULT 1;
ALTER TABLE itil.Problem   ADD WorkspaceId INT NOT NULL CONSTRAINT DF_Problem_WS   DEFAULT 1;
ALTER TABLE itil.[Change]  ADD WorkspaceId INT NOT NULL CONSTRAINT DF_Change_WS    DEFAULT 1;
ALTER TABLE kb.Article     ADD WorkspaceId INT NOT NULL CONSTRAINT DF_Article_WS   DEFAULT 1;

ALTER TABLE itil.Incident  ADD CONSTRAINT FK_Incident_Workspace FOREIGN KEY (WorkspaceId) REFERENCES core.Workspace(WorkspaceId);
ALTER TABLE itil.Problem   ADD CONSTRAINT FK_Problem_Workspace  FOREIGN KEY (WorkspaceId) REFERENCES core.Workspace(WorkspaceId);
ALTER TABLE itil.[Change]  ADD CONSTRAINT FK_Change_Workspace   FOREIGN KEY (WorkspaceId) REFERENCES core.Workspace(WorkspaceId);
ALTER TABLE kb.Article     ADD CONSTRAINT FK_Article_Workspace  FOREIGN KEY (WorkspaceId) REFERENCES core.Workspace(WorkspaceId);

-- Performance indexes
CREATE INDEX IX_Incident_Workspace ON itil.Incident(WorkspaceId) WHERE DeletedAt IS NULL;
CREATE INDEX IX_Problem_Workspace  ON itil.Problem(WorkspaceId)  WHERE DeletedAt IS NULL;
CREATE INDEX IX_Change_Workspace   ON itil.[Change](WorkspaceId) WHERE DeletedAt IS NULL;
CREATE INDEX IX_Article_Workspace  ON kb.Article(WorkspaceId)    WHERE DeletedAt IS NULL;
GO

-- ── Alter usp_CreateIncident to stamp WorkspaceId ────────────────────────────
ALTER PROCEDURE itil.usp_CreateIncident
    @Title                   NVARCHAR(256),
    @Description             NVARCHAR(MAX)  = NULL,
    @PriorityCode            VARCHAR(16),
    @CategoryCode            VARCHAR(32)    = NULL,
    @SubCategoryCode         VARCHAR(32)    = NULL,
    @ServiceSlug             VARCHAR(64)    = NULL,
    @CiAssetTag              VARCHAR(64)    = NULL,
    @ReporterExtId           VARCHAR(64)    = NULL,
    @ReporterDisplay         NVARCHAR(128)  = NULL,
    @CallerExtId             VARCHAR(64)    = NULL,
    @ContactMethodCode       VARCHAR(32)    = NULL,
    @Location                NVARCHAR(128)  = NULL,
    @AssigneeExtId           VARCHAR(64)    = NULL,
    @GroupSlug               VARCHAR(64)    = NULL,
    @ImpactCode              VARCHAR(16)    = NULL,
    @UrgencyCode             VARCHAR(16)    = NULL,
    @SeverityCode            VARCHAR(32)    = NULL,
    @IsMajorIncident         BIT            = 0,
    @ResolutionCodeCode      VARCHAR(32)    = NULL,
    @ResolutionNotes         NVARCHAR(MAX)  = NULL,
    @CreatedByExtId          VARCHAR(64)    = NULL,
    @WorkspaceId             INT            = 1,
    @NewIncidentId           BIGINT         OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @PriorityId        TINYINT = (SELECT PriorityId       FROM lookup.Priority         WHERE Code = @PriorityCode);
    DECLARE @StatusId          TINYINT = (SELECT StatusId FROM lookup.IncidentStatus WHERE Code =
        CASE WHEN @AssigneeExtId IS NOT NULL AND @AssigneeExtId <> '' THEN 'open' ELSE 'new' END);
    DECLARE @CategoryId        INT     = (SELECT CategoryId       FROM lookup.Category         WHERE Code = @CategoryCode);
    DECLARE @SubCategoryId     INT     = (SELECT SubCategoryId    FROM lookup.SubCategory      WHERE Code = @SubCategoryCode);
    DECLARE @ServiceId         INT     = (SELECT ServiceId        FROM core.Service            WHERE Slug = @ServiceSlug);
    DECLARE @CiId              INT     = (SELECT CiId             FROM core.ConfigurationItem  WHERE AssetTag = @CiAssetTag);
    DECLARE @ImpactId          TINYINT = (SELECT ImpactId         FROM lookup.Impact           WHERE Code = @ImpactCode);
    DECLARE @UrgencyId         TINYINT = (SELECT UrgencyId        FROM lookup.Urgency          WHERE Code = @UrgencyCode);
    DECLARE @SeverityId        TINYINT = (SELECT SeverityId       FROM lookup.Severity         WHERE Code = @SeverityCode);
    DECLARE @GroupId           INT     = (SELECT GroupId          FROM core.[Group]            WHERE Slug = @GroupSlug);
    DECLARE @ContactMethodId   TINYINT = (SELECT ContactMethodId  FROM lookup.ContactMethod    WHERE Code = @ContactMethodCode);
    DECLARE @ResolutionCodeId  TINYINT = (SELECT ResolutionCodeId FROM lookup.ResolutionCode   WHERE Code = @ResolutionCodeCode);

    DECLARE @ReporterUserId INT = (SELECT UserId FROM core.[User] WHERE ExternalId = @ReporterExtId);
    DECLARE @CallerUserId   INT = (SELECT UserId FROM core.[User] WHERE ExternalId = ISNULL(@CallerExtId, @ReporterExtId));
    DECLARE @AssigneeUserId INT = (SELECT UserId FROM core.[User] WHERE ExternalId = @AssigneeExtId);
    DECLARE @CreatedById    INT = (SELECT UserId FROM core.[User] WHERE ExternalId = @CreatedByExtId);

    IF @PriorityId IS NULL
        THROW 50001, 'Invalid priority code', 1;

    DECLARE @SlaPolicyId INT, @SlaResolutionTarget INT, @SlaResponseTarget INT;
    SELECT TOP (1)
        @SlaPolicyId         = SlaPolicyId,
        @SlaResolutionTarget = ResolutionMinutes,
        @SlaResponseTarget   = ResponseMinutes
    FROM core.SlaPolicy
    WHERE IsActive = 1
      AND PriorityId = @PriorityId
      AND (CategoryId = @CategoryId OR CategoryId IS NULL)
    ORDER BY CASE WHEN CategoryId = @CategoryId THEN 0 ELSE 1 END;

    IF @SlaResolutionTarget IS NULL
        SELECT @SlaResolutionTarget = DefaultResolutionMin, @SlaResponseTarget = DefaultResponseMin
        FROM lookup.Priority WHERE PriorityId = @PriorityId;

    DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();
    SET @NewIncidentId = NEXT VALUE FOR itil.IncidentSeq;

    BEGIN TRAN;
        INSERT INTO itil.Incident (
            IncidentId, Title, Description,
            PriorityId, StatusId, ImpactId, UrgencyId, SeverityId, CategoryId, SubCategoryId,
            ServiceId, CiId,
            ReporterUserId, ReporterDisplay, CallerUserId, AssigneeUserId, GroupId,
            ContactMethodId, Location, IsMajorIncident,
            ResolutionCodeId, ResolutionNotes,
            SlaPolicyId, SlaTargetMinutes, SlaResponseTargetMinutes, SlaStartedAt,
            WorkspaceId,
            OpenedAt, CreatedBy, CreatedAt, UpdatedAt
        ) VALUES (
            @NewIncidentId, @Title, @Description,
            @PriorityId, @StatusId, @ImpactId, @UrgencyId, @SeverityId, @CategoryId, @SubCategoryId,
            @ServiceId, @CiId,
            @ReporterUserId, @ReporterDisplay, @CallerUserId, @AssigneeUserId, @GroupId,
            @ContactMethodId, @Location, @IsMajorIncident,
            @ResolutionCodeId, @ResolutionNotes,
            @SlaPolicyId, @SlaResolutionTarget, @SlaResponseTarget, @Now,
            @WorkspaceId,
            @Now, @CreatedById, @Now, @Now
        );

        INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, NewValue, OccurredAt)
        VALUES ('INC', @NewIncidentId, @CreatedById, 'created', @Title, @Now);
    COMMIT;
END
GO

-- ── Alter usp_DashboardKpis to filter by workspace ───────────────────────────
ALTER PROCEDURE reporting.usp_DashboardKpis
    @WorkspaceId INT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        (SELECT COUNT(*) FROM itil.Incident i
            JOIN lookup.IncidentStatus s ON s.StatusId = i.StatusId
            WHERE s.IsTerminal = 0 AND i.DeletedAt IS NULL
              AND i.WorkspaceId = @WorkspaceId)                                            AS OpenIncidents,
        (SELECT COUNT(*) FROM reporting.vSlaBreaching v
            JOIN itil.Incident i ON i.IncidentId = v.IncidentId
            WHERE i.WorkspaceId = @WorkspaceId)                                            AS SlaAtRisk,
        (SELECT COUNT(*) FROM itil.[Change] c
            JOIN lookup.ChangeState cs ON cs.StateId = c.StateId
            WHERE cs.Code IN ('scheduled','implementing')
              AND c.ScheduledStart >= DATEADD(DAY, -7, SYSUTCDATETIME())
              AND c.WorkspaceId = @WorkspaceId)                                            AS ChangesThisWeek,
        (SELECT AVG(CAST(DATEDIFF(MINUTE, OpenedAt, ResolvedAt) AS BIGINT))
         FROM itil.Incident
         WHERE ResolvedAt IS NOT NULL
           AND OpenedAt >= DATEADD(DAY, -7, SYSUTCDATETIME())
           AND WorkspaceId = @WorkspaceId)                                                 AS AvgResolutionMinutes;
END
GO
