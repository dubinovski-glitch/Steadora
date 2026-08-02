/* ============================================================================
   Alter_20260627_BringUpToFullSchema.sql

   Brings an existing ApertureITSM database up to the current FullSchema.sql state.
   Apply on top of the live database:
       sqlcmd -S <server> -d ApertureITSM -C -b -i Alter_20260627_BringUpToFullSchema.sql

   What it does (all steps are guarded — safe to run on a DB that already has some
   or all of these changes, and safe to re-run):
     1. Workspaces + per-workspace field configuration
     2. Maps every existing user to the Default Workspace
     3. Adds WorkspaceId isolation columns / FKs / indexes to the ITIL tables
     4. Re-creates the workspace-aware stored procedures
     5. Drops the deprecated Priority Matrix table
     6. Drops the deprecated Category / SubCategory SortOrder columns
     7. Removes the redundant 'all' KB category (only when no article uses it)

   It does NOT touch user passwords or roles, and it does not drop/recreate data.
   ============================================================================ */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1. Workspaces (create + seed the default workspace only when absent) ----------
IF OBJECT_ID('core.Workspace','U') IS NULL
BEGIN
-- Workspaces: per-workspace field visibility and mandatory configuration

CREATE TABLE core.Workspace (
    WorkspaceId   INT           IDENTITY(1,1) NOT NULL,
    Name          NVARCHAR(100) NOT NULL,
    Slug          NVARCHAR(60)  NOT NULL,
    Description   NVARCHAR(500) NULL,
    IsDefault     BIT           NOT NULL CONSTRAINT DF_Workspace_IsDefault DEFAULT 0,
    IsActive      BIT           NOT NULL CONSTRAINT DF_Workspace_IsActive  DEFAULT 1,
    CreatedAt     DATETIME2(3)  NOT NULL CONSTRAINT DF_Workspace_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2(3)  NOT NULL CONSTRAINT DF_Workspace_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Workspace     PRIMARY KEY (WorkspaceId),
    CONSTRAINT UQ_Workspace_Slug UNIQUE (Slug)
);

CREATE TABLE core.WorkspaceField (
    WorkspaceFieldId INT          IDENTITY(1,1) NOT NULL,
    WorkspaceId      INT          NOT NULL,
    EntityType       NVARCHAR(20) NOT NULL,   -- 'incident' | 'change' | 'problem'
    FieldKey         NVARCHAR(50) NOT NULL,
    IsVisible        BIT          NOT NULL CONSTRAINT DF_WorkspaceField_IsVisible    DEFAULT 1,
    IsMandatory      BIT          NOT NULL CONSTRAINT DF_WorkspaceField_IsMandatory  DEFAULT 0,
    CONSTRAINT PK_WorkspaceField    PRIMARY KEY (WorkspaceFieldId),
    CONSTRAINT UQ_WorkspaceField    UNIQUE (WorkspaceId, EntityType, FieldKey),
    CONSTRAINT FK_WorkspaceField_Ws FOREIGN KEY (WorkspaceId)
        REFERENCES core.Workspace(WorkspaceId) ON DELETE CASCADE
);

CREATE TABLE core.WorkspaceUser (
    WorkspaceId INT NOT NULL,
    UserId      INT NOT NULL,
    CONSTRAINT PK_WorkspaceUser    PRIMARY KEY (WorkspaceId, UserId),
    CONSTRAINT FK_WorkspaceUser_Ws FOREIGN KEY (WorkspaceId)
        REFERENCES core.Workspace(WorkspaceId) ON DELETE CASCADE,
    CONSTRAINT FK_WorkspaceUser_U  FOREIGN KEY (UserId)
        REFERENCES core.[User](UserId)
);

-- ── Default workspace ──────────────────────────────────────────────────────────
INSERT INTO core.Workspace (Name, Slug, Description, IsDefault, IsActive)
VALUES (N'Default Workspace', N'default',
        N'Default workspace with all fields enabled', 1, 1);

DECLARE @DefId INT = SCOPE_IDENTITY();

-- Incident fields
INSERT INTO core.WorkspaceField (WorkspaceId, EntityType, FieldKey, IsVisible, IsMandatory) VALUES
(@DefId, 'incident', 'caller',          1, 1),
(@DefId, 'incident', 'contactMethod',   1, 0),
(@DefId, 'incident', 'location',        1, 0),
(@DefId, 'incident', 'service',         1, 1),
(@DefId, 'incident', 'category',        1, 1),
(@DefId, 'incident', 'subCategory',     1, 0),
(@DefId, 'incident', 'ciAssetTag',      1, 0),
(@DefId, 'incident', 'description',     1, 0),
(@DefId, 'incident', 'priority',        1, 0),
(@DefId, 'incident', 'severity',        1, 0),
(@DefId, 'incident', 'isMajorIncident', 1, 0),
(@DefId, 'incident', 'group',           1, 1),
(@DefId, 'incident', 'assignee',        1, 0),
(@DefId, 'incident', 'resolutionCode',  1, 0),
(@DefId, 'incident', 'resolutionNotes', 1, 0);

-- Change fields
INSERT INTO core.WorkspaceField (WorkspaceId, EntityType, FieldKey, IsVisible, IsMandatory) VALUES
(@DefId, 'change', 'description',      1, 0),
(@DefId, 'change', 'rolloutPlan',      1, 0),
(@DefId, 'change', 'rollbackPlan',     1, 0),
(@DefId, 'change', 'impactNotes',      1, 0),
(@DefId, 'change', 'changeType',       1, 0),
(@DefId, 'change', 'risk',             1, 0),
(@DefId, 'change', 'owner',            1, 0),
(@DefId, 'change', 'approver',         1, 0),
(@DefId, 'change', 'group',            1, 0),
(@DefId, 'change', 'cabName',          1, 0),
(@DefId, 'change', 'scheduledStart',   1, 0),
(@DefId, 'change', 'scheduledEnd',     1, 0),
(@DefId, 'change', 'downtimeEstimate', 1, 0);

-- Problem fields
INSERT INTO core.WorkspaceField (WorkspaceId, EntityType, FieldKey, IsVisible, IsMandatory) VALUES
(@DefId, 'problem', 'description', 1, 0),
(@DefId, 'problem', 'rootCause',   1, 0),
(@DefId, 'problem', 'workaround',  1, 0),
(@DefId, 'problem', 'priority',    1, 0),
(@DefId, 'problem', 'group',       1, 0),
(@DefId, 'problem', 'assignee',    1, 0);
END
GO

-- 2. Map every existing user to the default workspace (idempotent) --------------
INSERT INTO core.WorkspaceUser (WorkspaceId, UserId)
SELECT w.WorkspaceId, u.UserId
FROM core.Workspace w
CROSS JOIN core.[User] u
WHERE w.IsDefault = 1
  AND NOT EXISTS (SELECT 1 FROM core.WorkspaceUser wu
                  WHERE wu.WorkspaceId = w.WorkspaceId AND wu.UserId = u.UserId);
GO

-- 3. WorkspaceId isolation columns -------------------------------------------
IF COL_LENGTH('itil.Incident','WorkspaceId') IS NULL
    ALTER TABLE itil.Incident ADD WorkspaceId INT NOT NULL CONSTRAINT DF_Incident_WS DEFAULT 1;
IF COL_LENGTH('itil.Problem','WorkspaceId') IS NULL
    ALTER TABLE itil.Problem  ADD WorkspaceId INT NOT NULL CONSTRAINT DF_Problem_WS  DEFAULT 1;
IF COL_LENGTH('itil.Change','WorkspaceId') IS NULL
    ALTER TABLE itil.[Change] ADD WorkspaceId INT NOT NULL CONSTRAINT DF_Change_WS   DEFAULT 1;
IF COL_LENGTH('kb.Article','WorkspaceId') IS NULL
    ALTER TABLE kb.Article    ADD WorkspaceId INT NOT NULL CONSTRAINT DF_Article_WS  DEFAULT 1;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Incident_Workspace')
    ALTER TABLE itil.Incident ADD CONSTRAINT FK_Incident_Workspace FOREIGN KEY (WorkspaceId) REFERENCES core.Workspace(WorkspaceId);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Problem_Workspace')
    ALTER TABLE itil.Problem  ADD CONSTRAINT FK_Problem_Workspace  FOREIGN KEY (WorkspaceId) REFERENCES core.Workspace(WorkspaceId);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Change_Workspace')
    ALTER TABLE itil.[Change] ADD CONSTRAINT FK_Change_Workspace   FOREIGN KEY (WorkspaceId) REFERENCES core.Workspace(WorkspaceId);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Article_Workspace')
    ALTER TABLE kb.Article    ADD CONSTRAINT FK_Article_Workspace  FOREIGN KEY (WorkspaceId) REFERENCES core.Workspace(WorkspaceId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Incident_Workspace' AND object_id=OBJECT_ID('itil.Incident'))
    CREATE INDEX IX_Incident_Workspace ON itil.Incident(WorkspaceId) WHERE DeletedAt IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Problem_Workspace' AND object_id=OBJECT_ID('itil.Problem'))
    CREATE INDEX IX_Problem_Workspace  ON itil.Problem(WorkspaceId)  WHERE DeletedAt IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Change_Workspace' AND object_id=OBJECT_ID('itil.Change'))
    CREATE INDEX IX_Change_Workspace   ON itil.[Change](WorkspaceId) WHERE DeletedAt IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Article_Workspace' AND object_id=OBJECT_ID('kb.Article'))
    CREATE INDEX IX_Article_Workspace  ON kb.Article(WorkspaceId)    WHERE DeletedAt IS NULL;
GO

-- 4. Workspace-aware stored procedures (CREATE OR ALTER = idempotent) ---------
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

CREATE OR ALTER PROCEDURE itil.usp_CreateIncident
    @Title NVARCHAR(256), @Description NVARCHAR(MAX)=NULL, @PriorityCode VARCHAR(16),
    @CategoryCode VARCHAR(32)=NULL, @SubCategoryCode VARCHAR(32)=NULL, @ServiceSlug VARCHAR(64)=NULL,
    @CiAssetTag VARCHAR(64)=NULL, @ReporterExtId VARCHAR(64)=NULL, @ReporterDisplay NVARCHAR(128)=NULL,
    @CallerExtId VARCHAR(64)=NULL, @ContactMethodCode VARCHAR(32)=NULL, @Location NVARCHAR(128)=NULL,
    @AssigneeExtId VARCHAR(64)=NULL, @GroupSlug VARCHAR(64)=NULL, @ImpactCode VARCHAR(16)=NULL,
    @UrgencyCode VARCHAR(16)=NULL, @SeverityCode VARCHAR(32)=NULL, @IsMajorIncident BIT=0,
    @ResolutionCodeCode VARCHAR(32)=NULL, @ResolutionNotes NVARCHAR(MAX)=NULL,
    @CreatedByExtId VARCHAR(64)=NULL, @WorkspaceId INT=1, @NewIncidentId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    DECLARE @PriorityId      TINYINT = (SELECT PriorityId      FROM lookup.Priority       WHERE Code=@PriorityCode);
    DECLARE @StatusId        TINYINT = (SELECT StatusId        FROM lookup.IncidentStatus  WHERE Code=CASE WHEN @AssigneeExtId IS NOT NULL AND @AssigneeExtId<>'' THEN 'open' ELSE 'new' END);
    DECLARE @CategoryId      INT     = (SELECT CategoryId      FROM lookup.Category        WHERE Code=@CategoryCode);
    DECLARE @SubCategoryId   INT     = (SELECT SubCategoryId   FROM lookup.SubCategory     WHERE Code=@SubCategoryCode);
    DECLARE @ServiceId       INT     = (SELECT ServiceId       FROM core.Service           WHERE Slug=@ServiceSlug);
    DECLARE @CiId            INT     = (SELECT CiId            FROM core.ConfigurationItem WHERE AssetTag=@CiAssetTag);
    DECLARE @ImpactId        TINYINT = (SELECT ImpactId        FROM lookup.Impact          WHERE Code=@ImpactCode);
    DECLARE @UrgencyId       TINYINT = (SELECT UrgencyId       FROM lookup.Urgency         WHERE Code=@UrgencyCode);
    DECLARE @SeverityId      TINYINT = (SELECT SeverityId      FROM lookup.Severity        WHERE Code=@SeverityCode);
    DECLARE @GroupId         INT     = (SELECT GroupId         FROM core.[Group]           WHERE Slug=@GroupSlug);
    DECLARE @ContactMethodId TINYINT = (SELECT ContactMethodId FROM lookup.ContactMethod   WHERE Code=@ContactMethodCode);
    DECLARE @ResolutionCodeId TINYINT= (SELECT ResolutionCodeId FROM lookup.ResolutionCode WHERE Code=@ResolutionCodeCode);
    DECLARE @ReporterUserId  INT = (SELECT UserId FROM core.[User] WHERE ExternalId=@ReporterExtId);
    DECLARE @CallerUserId    INT = (SELECT UserId FROM core.[User] WHERE ExternalId=ISNULL(@CallerExtId,@ReporterExtId));
    DECLARE @AssigneeUserId  INT = (SELECT UserId FROM core.[User] WHERE ExternalId=@AssigneeExtId);
    DECLARE @CreatedById     INT = (SELECT UserId FROM core.[User] WHERE ExternalId=@CreatedByExtId);
    IF @PriorityId IS NULL THROW 50001,'Invalid priority code',1;
    DECLARE @SlaPolicyId INT, @SlaResolutionTarget INT, @SlaResponseTarget INT;
    SELECT TOP(1) @SlaPolicyId=SlaPolicyId, @SlaResolutionTarget=ResolutionMinutes, @SlaResponseTarget=ResponseMinutes
    FROM core.SlaPolicy
    WHERE IsActive=1 AND PriorityId=@PriorityId AND (CategoryId=@CategoryId OR CategoryId IS NULL)
    ORDER BY CASE WHEN CategoryId=@CategoryId THEN 0 ELSE 1 END;
    IF @SlaResolutionTarget IS NULL
        SELECT @SlaResolutionTarget=DefaultResolutionMin, @SlaResponseTarget=DefaultResponseMin
        FROM lookup.Priority WHERE PriorityId=@PriorityId;
    DECLARE @Now DATETIME2(3)=SYSUTCDATETIME();
    SET @NewIncidentId=NEXT VALUE FOR itil.IncidentSeq;
    BEGIN TRAN;
        INSERT INTO itil.Incident(
            IncidentId,Title,Description,PriorityId,StatusId,ImpactId,UrgencyId,SeverityId,
            CategoryId,SubCategoryId,ServiceId,CiId,ReporterUserId,ReporterDisplay,CallerUserId,
            AssigneeUserId,GroupId,ContactMethodId,Location,IsMajorIncident,ResolutionCodeId,
            ResolutionNotes,SlaPolicyId,SlaTargetMinutes,SlaResponseTargetMinutes,SlaStartedAt,
            WorkspaceId,OpenedAt,CreatedBy,CreatedAt,UpdatedAt)
        VALUES(
            @NewIncidentId,@Title,@Description,@PriorityId,@StatusId,@ImpactId,@UrgencyId,@SeverityId,
            @CategoryId,@SubCategoryId,@ServiceId,@CiId,@ReporterUserId,@ReporterDisplay,@CallerUserId,
            @AssigneeUserId,@GroupId,@ContactMethodId,@Location,@IsMajorIncident,@ResolutionCodeId,
            @ResolutionNotes,@SlaPolicyId,@SlaResolutionTarget,@SlaResponseTarget,@Now,
            @WorkspaceId,@Now,@CreatedById,@Now,@Now);
        INSERT INTO audit.ActivityEvent(ParentType,ParentId,ActorUserId,Kind,NewValue,OccurredAt)
        VALUES('INC',@NewIncidentId,@CreatedById,'created',@Title,@Now);
    COMMIT;
END
GO

CREATE OR ALTER PROCEDURE reporting.usp_DashboardKpis
    @WorkspaceId INT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        (SELECT COUNT(*) FROM itil.Incident i
            JOIN lookup.IncidentStatus s ON s.StatusId=i.StatusId
            WHERE s.IsTerminal=0 AND i.DeletedAt IS NULL AND i.WorkspaceId=@WorkspaceId)   AS OpenIncidents,
        (SELECT COUNT(*) FROM reporting.vSlaBreaching v
            JOIN itil.Incident i ON i.IncidentId=v.IncidentId
            WHERE i.WorkspaceId=@WorkspaceId)                                               AS SlaAtRisk,
        (SELECT COUNT(*) FROM itil.[Change] c
            JOIN lookup.ChangeState cs ON cs.StateId=c.StateId
            WHERE cs.Code IN ('scheduled','implementing')
              AND c.ScheduledStart>=DATEADD(DAY,-7,SYSUTCDATETIME())
              AND c.WorkspaceId=@WorkspaceId)                                               AS ChangesThisWeek,
        (SELECT AVG(CAST(DATEDIFF(MINUTE,OpenedAt,ResolvedAt) AS BIGINT))
         FROM itil.Incident
         WHERE ResolvedAt IS NOT NULL AND OpenedAt>=DATEADD(DAY,-7,SYSUTCDATETIME())
           AND WorkspaceId=@WorkspaceId)                                                    AS AvgResolutionMinutes;
END
GO

-- 5. Drop deprecated Priority Matrix -----------------------------------------
DROP TABLE IF EXISTS lookup.PriorityMatrix;
GO

-- 6. Drop deprecated SortOrder columns (drop their default constraints first) --
DECLARE @df NVARCHAR(256);

SELECT @df = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID('lookup.Category') AND c.name = 'SortOrder';
IF @df IS NOT NULL EXEC('ALTER TABLE lookup.Category DROP CONSTRAINT [' + @df + ']');
IF COL_LENGTH('lookup.Category','SortOrder') IS NOT NULL
    ALTER TABLE lookup.Category DROP COLUMN SortOrder;

SET @df = NULL;
SELECT @df = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID('lookup.SubCategory') AND c.name = 'SortOrder';
IF @df IS NOT NULL EXEC('ALTER TABLE lookup.SubCategory DROP CONSTRAINT [' + @df + ']');
IF COL_LENGTH('lookup.SubCategory','SortOrder') IS NOT NULL
    ALTER TABLE lookup.SubCategory DROP COLUMN SortOrder;
GO

-- 7. Remove the redundant 'all' KB category (only when no article references it) -
IF EXISTS (SELECT 1 FROM kb.Category WHERE Slug = 'all')
   AND NOT EXISTS (SELECT 1 FROM kb.Article a
                   JOIN kb.Category c ON c.KbCategoryId = a.KbCategoryId
                   WHERE c.Slug = 'all')
    DELETE FROM kb.Category WHERE Slug = 'all';
GO

PRINT 'Alter_20260627_BringUpToFullSchema applied successfully.';
GO
