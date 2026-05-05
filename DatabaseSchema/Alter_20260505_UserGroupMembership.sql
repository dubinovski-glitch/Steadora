-- =============================================================================
-- Alter_20260505_UserGroupMembership.sql
-- Date: 2026-05-05
-- Changes:
--   1. Create core.UserGroup junction table (many-to-many user↔group membership)
--   2. Migrate existing PrimaryGroupId values into the new junction table
--   3. Drop FK_User_PrimaryGroup and PrimaryGroupId column from core.[User]
--   4. Add 'open' incident status (SortOrder 2; existing statuses shift up by 1)
--   5. Update usp_CreateIncident: auto-assign 'open' status when an assignee is given
--   6. Update usp_UpdateIncident: auto-transition 'new' → 'open' when assignee is first set
-- =============================================================================

/* ----------------------------------------------------------------------------
   1. UserGroup junction table
   ---------------------------------------------------------------------------- */
CREATE TABLE core.UserGroup (
    UserGroupId  INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
    UserId       INT NOT NULL,
    GroupId      INT NOT NULL,
    CONSTRAINT UQ_UserGroup        UNIQUE (UserId, GroupId),
    CONSTRAINT FK_UserGroup_User   FOREIGN KEY (UserId)  REFERENCES core.[User]  (UserId),
    CONSTRAINT FK_UserGroup_Group  FOREIGN KEY (GroupId) REFERENCES core.[Group] (GroupId)
);
CREATE INDEX IX_UserGroup_UserId  ON core.UserGroup (UserId);
CREATE INDEX IX_UserGroup_GroupId ON core.UserGroup (GroupId);
GO

/* ----------------------------------------------------------------------------
   2. Migrate existing PrimaryGroupId → UserGroup
   ---------------------------------------------------------------------------- */
INSERT INTO core.UserGroup (UserId, GroupId)
SELECT UserId, PrimaryGroupId
FROM core.[User]
WHERE PrimaryGroupId IS NOT NULL;
GO

/* ----------------------------------------------------------------------------
   3. Drop FK and column
   ---------------------------------------------------------------------------- */
ALTER TABLE core.[User] DROP CONSTRAINT FK_User_PrimaryGroup;
GO
ALTER TABLE core.[User] DROP COLUMN PrimaryGroupId;
GO

/* ----------------------------------------------------------------------------
   4. Add 'open' status
      Shift existing SortOrders for progress/pending/resolved/closed up by 1,
      then insert 'open' at SortOrder = 2 (between 'new' = 1 and 'progress' = 3).
   ---------------------------------------------------------------------------- */
UPDATE lookup.IncidentStatus SET SortOrder = SortOrder + 1 WHERE SortOrder >= 2;
GO
INSERT INTO lookup.IncidentStatus (StatusId, Code, DisplayName, IsTerminal, PausesSla, SortOrder)
VALUES (6, 'open', 'Open', 0, 0, 2);
GO

/* ----------------------------------------------------------------------------
   5. usp_CreateIncident — use 'open' when an assignee is provided
   ---------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE itil.usp_CreateIncident
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
    @NewIncidentId           BIGINT         OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @PriorityId        TINYINT = (SELECT PriorityId       FROM lookup.Priority         WHERE Code = @PriorityCode);
    -- Use 'open' when an assignee is given at creation time, otherwise 'new'
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
            OpenedAt, CreatedBy, CreatedAt, UpdatedAt
        ) VALUES (
            @NewIncidentId, @Title, @Description,
            @PriorityId, @StatusId, @ImpactId, @UrgencyId, @SeverityId, @CategoryId, @SubCategoryId,
            @ServiceId, @CiId,
            @ReporterUserId, @ReporterDisplay, @CallerUserId, @AssigneeUserId, @GroupId,
            @ContactMethodId, @Location, @IsMajorIncident,
            @ResolutionCodeId, @ResolutionNotes,
            @SlaPolicyId, @SlaResolutionTarget, @SlaResponseTarget, @Now,
            @Now, @CreatedById, @Now, @Now
        );

        INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, NewValue, OccurredAt)
        VALUES ('INC', @NewIncidentId, @CreatedById, 'created', @Title, @Now);
    COMMIT;
END
GO

/* ----------------------------------------------------------------------------
   6. usp_UpdateIncident — auto-transition 'new' → 'open' when assignee is set
   ---------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE itil.usp_UpdateIncident
    @IncidentId         BIGINT,
    @Title              NVARCHAR(256),
    @Description        NVARCHAR(MAX)   = NULL,
    @CallerExtId        VARCHAR(64)     = NULL,
    @ContactMethodCode  VARCHAR(32)     = NULL,
    @Location           NVARCHAR(128)   = NULL,
    @ServiceSlug        VARCHAR(64)     = NULL,
    @CategoryCode       VARCHAR(32)     = NULL,
    @SubCategoryCode    VARCHAR(32)     = NULL,
    @CiAssetTag         VARCHAR(64)     = NULL,
    @PriorityCode       VARCHAR(16)     = NULL,
    @ImpactCode         VARCHAR(16)     = NULL,
    @UrgencyCode        VARCHAR(16)     = NULL,
    @SeverityCode       VARCHAR(32)     = NULL,
    @IsMajorIncident    BIT             = 0,
    @GroupSlug          VARCHAR(64)     = NULL,
    @AssigneeExtId      VARCHAR(64)     = NULL,
    @ResolutionCodeCode VARCHAR(32)     = NULL,
    @ResolutionNotes    NVARCHAR(MAX)   = NULL,
    @ActorExtId         VARCHAR(64)     = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @CallerUserId     INT     = (SELECT UserId          FROM core.[User]             WHERE ExternalId    = @CallerExtId);
    DECLARE @ContactMethodId  TINYINT = (SELECT ContactMethodId FROM lookup.ContactMethod    WHERE Code          = @ContactMethodCode);
    DECLARE @ServiceId        INT     = (SELECT ServiceId       FROM core.Service            WHERE Slug          = @ServiceSlug);
    DECLARE @CategoryId       INT     = (SELECT CategoryId      FROM lookup.Category         WHERE Code          = @CategoryCode);
    DECLARE @SubCategoryId    INT     = (SELECT SubCategoryId   FROM lookup.SubCategory      WHERE Code          = @SubCategoryCode);
    DECLARE @CiId             INT     = (SELECT CiId            FROM core.ConfigurationItem  WHERE AssetTag      = @CiAssetTag);
    DECLARE @PriorityId       TINYINT = (SELECT PriorityId      FROM lookup.Priority         WHERE Code          = @PriorityCode);
    DECLARE @ImpactId         TINYINT = (SELECT ImpactId        FROM lookup.Impact           WHERE Code          = @ImpactCode);
    DECLARE @UrgencyId        TINYINT = (SELECT UrgencyId       FROM lookup.Urgency          WHERE Code          = @UrgencyCode);
    DECLARE @SeverityId       TINYINT = (SELECT SeverityId      FROM lookup.Severity         WHERE Code          = @SeverityCode);
    DECLARE @GroupId          INT     = (SELECT GroupId         FROM core.[Group]            WHERE Slug          = @GroupSlug);
    DECLARE @AssigneeUserId   INT     = (SELECT UserId          FROM core.[User]             WHERE ExternalId    = @AssigneeExtId);
    DECLARE @ResolutionCodeId TINYINT = (SELECT ResolutionCodeId FROM lookup.ResolutionCode  WHERE Code          = @ResolutionCodeCode);
    DECLARE @ActorUserId      INT     = (SELECT UserId          FROM core.[User]             WHERE ExternalId    = @ActorExtId);

    -- Capture status before the update for auto-transition check
    DECLARE @PrevStatusCode VARCHAR(16);
    SELECT @PrevStatusCode = s.Code
    FROM itil.Incident i
    JOIN lookup.IncidentStatus s ON s.StatusId = i.StatusId
    WHERE i.IncidentId = @IncidentId;

    DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();

    UPDATE itil.Incident SET
        Title             = @Title,
        Description       = NULLIF(@Description,     ''),
        CallerUserId      = @CallerUserId,
        ContactMethodId   = @ContactMethodId,
        Location          = NULLIF(@Location,        ''),
        ServiceId         = @ServiceId,
        CategoryId        = @CategoryId,
        SubCategoryId     = @SubCategoryId,
        CiId              = @CiId,
        PriorityId        = ISNULL(@PriorityId,      PriorityId),
        ImpactId          = @ImpactId,
        UrgencyId         = @UrgencyId,
        SeverityId        = @SeverityId,
        IsMajorIncident   = @IsMajorIncident,
        GroupId           = @GroupId,
        AssigneeUserId    = @AssigneeUserId,
        ResolutionCodeId  = @ResolutionCodeId,
        ResolutionNotes   = NULLIF(@ResolutionNotes, ''),
        UpdatedAt         = @Now
    WHERE IncidentId = @IncidentId;

    INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, OccurredAt)
    VALUES ('INC', @IncidentId, @ActorUserId, 'updated', @Now);

    -- Auto-transition: 'new' → 'open' when an assignee is first set
    IF @AssigneeUserId IS NOT NULL AND @PrevStatusCode = 'new'
    BEGIN
        DECLARE @OpenStatusId TINYINT = (SELECT StatusId FROM lookup.IncidentStatus WHERE Code = 'open');
        UPDATE itil.Incident SET StatusId = @OpenStatusId WHERE IncidentId = @IncidentId;
        INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, Field, OldValue, NewValue, OccurredAt)
        VALUES ('INC', @IncidentId, @ActorUserId, 'status_changed', 'status', 'new', 'open', @Now);
    END
END
GO
