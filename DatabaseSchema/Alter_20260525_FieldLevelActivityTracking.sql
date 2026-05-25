/* ============================================================================
   Alter script: field-level activity tracking for incidents and problems
   Date: 2026-05-25
   Changes:
     - usp_UpdateIncident: replace generic 'updated' event with per-field
       'field_changed' events (Title, Priority, Severity, Assignment Team,
       Assignee, Service, Category, Major Incident)
     - usp_AssignIncident: record assignee display names instead of raw IDs
     - usp_ChangeIncidentStatus: record status codes instead of raw IDs
   Safe to run against an existing database (CREATE OR ALTER).
   ============================================================================ */

USE ApertureITSM;
GO

CREATE OR ALTER PROCEDURE itil.usp_AssignIncident
    @IncidentId    BIGINT,
    @AssigneeExtId VARCHAR(64),
    @ActorExtId    VARCHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @AssigneeId      INT           = (SELECT UserId      FROM core.[User] WHERE ExternalId = @AssigneeExtId);
    DECLARE @ActorId         INT           = (SELECT UserId      FROM core.[User] WHERE ExternalId = @ActorExtId);
    DECLARE @OldId           INT           = (SELECT AssigneeUserId FROM itil.Incident WHERE IncidentId = @IncidentId);
    DECLARE @OldAssigneeName NVARCHAR(256) = (SELECT DisplayName FROM core.[User] WHERE UserId = @OldId);
    DECLARE @NewAssigneeName NVARCHAR(256) = (SELECT DisplayName FROM core.[User] WHERE UserId = @AssigneeId);

    BEGIN TRAN;
        UPDATE itil.Incident
        SET AssigneeUserId = @AssigneeId,
            UpdatedAt      = SYSUTCDATETIME()
        WHERE IncidentId = @IncidentId;

        INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, Field, OldValue, NewValue)
        VALUES ('INC', @IncidentId, @ActorId, 'field_changed', 'Assignee', @OldAssigneeName, @NewAssigneeName);
    COMMIT;
END
GO

CREATE OR ALTER PROCEDURE itil.usp_ChangeIncidentStatus
    @IncidentId   BIGINT,
    @StatusCode   VARCHAR(16),
    @ActorExtId   VARCHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @StatusId TINYINT = (SELECT StatusId FROM lookup.IncidentStatus WHERE Code = @StatusCode);
    IF @StatusId IS NULL THROW 50002, 'Invalid status code', 1;

    DECLARE @ActorId      INT          = (SELECT UserId FROM core.[User] WHERE ExternalId = @ActorExtId);
    DECLARE @OldStatusId  TINYINT;
    DECLARE @PausedAt     DATETIME2(3);
    DECLARE @WasPaused    BIT;
    DECLARE @OldCode      VARCHAR(16);
    DECLARE @NewPausesSla BIT;

    SELECT @OldStatusId = StatusId, @PausedAt = SlaPausedAt
      FROM itil.Incident WHERE IncidentId = @IncidentId;

    SELECT @WasPaused = PausesSla, @OldCode = Code
      FROM lookup.IncidentStatus WHERE StatusId = @OldStatusId;
    SELECT @NewPausesSla = PausesSla FROM lookup.IncidentStatus WHERE StatusId = @StatusId;

    DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();

    BEGIN TRAN;
        IF @WasPaused = 0 AND @NewPausesSla = 1
        BEGIN
            UPDATE itil.Incident SET SlaPausedAt = @Now WHERE IncidentId = @IncidentId;
        END
        ELSE IF @WasPaused = 1 AND @NewPausesSla = 0 AND @PausedAt IS NOT NULL
        BEGIN
            UPDATE itil.Incident
            SET SlaPausedSeconds = SlaPausedSeconds + DATEDIFF(SECOND, @PausedAt, @Now),
                SlaPausedAt      = NULL
            WHERE IncidentId = @IncidentId;
        END;

        UPDATE itil.Incident
        SET StatusId    = @StatusId,
            ResolvedAt  = CASE WHEN @StatusCode = 'resolved' AND ResolvedAt IS NULL THEN @Now ELSE ResolvedAt END,
            ClosedAt    = CASE WHEN @StatusCode = 'closed'   AND ClosedAt   IS NULL THEN @Now ELSE ClosedAt   END,
            UpdatedAt   = @Now
        WHERE IncidentId = @IncidentId;

        INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, Field, OldValue, NewValue, OccurredAt)
        VALUES ('INC', @IncidentId, @ActorId, 'field_changed', 'Status', @OldCode, @StatusCode, @Now);
    COMMIT;
END
GO

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

    DECLARE @CallerUserId     INT     = (SELECT UserId           FROM core.[User]            WHERE ExternalId   = @CallerExtId);
    DECLARE @ContactMethodId  TINYINT = (SELECT ContactMethodId  FROM lookup.ContactMethod   WHERE Code         = @ContactMethodCode);
    DECLARE @ServiceId        INT     = (SELECT ServiceId        FROM core.Service           WHERE Slug         = @ServiceSlug);
    DECLARE @CategoryId       INT     = (SELECT CategoryId       FROM lookup.Category        WHERE Code         = @CategoryCode);
    DECLARE @SubCategoryId    INT     = (SELECT SubCategoryId    FROM lookup.SubCategory     WHERE Code         = @SubCategoryCode);
    DECLARE @CiId             INT     = (SELECT CiId             FROM core.ConfigurationItem WHERE AssetTag     = @CiAssetTag);
    DECLARE @PriorityId       TINYINT = (SELECT PriorityId       FROM lookup.Priority        WHERE Code         = @PriorityCode);
    DECLARE @ImpactId         TINYINT = (SELECT ImpactId         FROM lookup.Impact          WHERE Code         = @ImpactCode);
    DECLARE @UrgencyId        TINYINT = (SELECT UrgencyId        FROM lookup.Urgency         WHERE Code         = @UrgencyCode);
    DECLARE @SeverityId       TINYINT = (SELECT SeverityId       FROM lookup.Severity        WHERE Code         = @SeverityCode);
    DECLARE @GroupId          INT     = (SELECT GroupId          FROM core.[Group]           WHERE Slug         = @GroupSlug);
    DECLARE @AssigneeUserId   INT     = (SELECT UserId           FROM core.[User]            WHERE ExternalId   = @AssigneeExtId);
    DECLARE @ResolutionCodeId TINYINT = (SELECT ResolutionCodeId FROM lookup.ResolutionCode  WHERE Code         = @ResolutionCodeCode);
    DECLARE @ActorUserId      INT     = (SELECT UserId           FROM core.[User]            WHERE ExternalId   = @ActorExtId);

    -- Capture old field values before the update
    DECLARE @PrevStatusCode  VARCHAR(16);
    DECLARE @OldTitle        NVARCHAR(256);
    DECLARE @OldPriorityCode VARCHAR(16);
    DECLARE @OldSeverityCode VARCHAR(32);
    DECLARE @OldGroupName    NVARCHAR(128);
    DECLARE @OldAssigneeName NVARCHAR(256);
    DECLARE @OldServiceName  NVARCHAR(128);
    DECLARE @OldCategoryName NVARCHAR(128);
    DECLARE @OldIsMajor      BIT;

    SELECT
        @PrevStatusCode  = st.Code,
        @OldTitle        = i.Title,
        @OldPriorityCode = pr.Code,
        @OldSeverityCode = sev.Code,
        @OldGroupName    = grp.Name,
        @OldAssigneeName = asgn.DisplayName,
        @OldServiceName  = svc.Name,
        @OldCategoryName = cat.DisplayName,
        @OldIsMajor      = i.IsMajorIncident
    FROM itil.Incident i
    LEFT JOIN lookup.IncidentStatus st   ON st.StatusId    = i.StatusId
    LEFT JOIN lookup.Priority       pr   ON pr.PriorityId  = i.PriorityId
    LEFT JOIN lookup.Severity       sev  ON sev.SeverityId = i.SeverityId
    LEFT JOIN core.[Group]          grp  ON grp.GroupId    = i.GroupId
    LEFT JOIN core.[User]           asgn ON asgn.UserId    = i.AssigneeUserId
    LEFT JOIN core.Service          svc  ON svc.ServiceId  = i.ServiceId
    LEFT JOIN lookup.Category       cat  ON cat.CategoryId = i.CategoryId
    WHERE i.IncidentId = @IncidentId;

    DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();

    -- Resolve new display names for comparison
    DECLARE @NewGroupName    NVARCHAR(128) = (SELECT Name        FROM core.[Group]    WHERE GroupId    = @GroupId);
    DECLARE @NewAssigneeName NVARCHAR(256) = (SELECT DisplayName FROM core.[User]     WHERE UserId     = @AssigneeUserId);
    DECLARE @NewServiceName  NVARCHAR(128) = (SELECT Name        FROM core.Service    WHERE ServiceId  = @ServiceId);
    DECLARE @NewCategoryName NVARCHAR(128) = (SELECT DisplayName FROM lookup.Category WHERE CategoryId = @CategoryId);

    BEGIN TRAN;
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

        -- Insert one row per field that actually changed
        INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, Field, OldValue, NewValue, OccurredAt)
        SELECT 'INC', @IncidentId, @ActorUserId, 'field_changed', v.Field, v.OldVal, v.NewVal, @Now
        FROM (VALUES
            ('Title',           @OldTitle,        @Title),
            ('Priority',        @OldPriorityCode, @PriorityCode),
            ('Severity',        @OldSeverityCode, @SeverityCode),
            ('Assignment Team', @OldGroupName,    @NewGroupName),
            ('Assignee',        @OldAssigneeName, @NewAssigneeName),
            ('Service',         @OldServiceName,  @NewServiceName),
            ('Category',        @OldCategoryName, @NewCategoryName)
        ) AS v(Field, OldVal, NewVal)
        WHERE ISNULL(v.OldVal, '') <> ISNULL(v.NewVal, '');

        IF @OldIsMajor <> @IsMajorIncident
            INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, Field, OldValue, NewValue, OccurredAt)
            VALUES ('INC', @IncidentId, @ActorUserId, 'field_changed', 'Major Incident',
                    CASE @OldIsMajor      WHEN 1 THEN 'Yes' ELSE 'No' END,
                    CASE @IsMajorIncident WHEN 1 THEN 'Yes' ELSE 'No' END, @Now);

        -- Auto-transition: 'new' → 'open' when an assignee is first set
        IF @AssigneeUserId IS NOT NULL AND @PrevStatusCode = 'new'
        BEGIN
            DECLARE @OpenStatusId TINYINT = (SELECT StatusId FROM lookup.IncidentStatus WHERE Code = 'open');
            UPDATE itil.Incident SET StatusId = @OpenStatusId WHERE IncidentId = @IncidentId;
            INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, Field, OldValue, NewValue, OccurredAt)
            VALUES ('INC', @IncidentId, @ActorUserId, 'field_changed', 'Status', 'new', 'open', @Now);
        END
    COMMIT;
END
GO
