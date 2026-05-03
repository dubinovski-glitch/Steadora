/* ----------------------------------------------------------------------------
   Alter_20260503_IncidentFieldsExpansion.sql
   Expands itil.Incident with all fields defined in ITSM_Incident_Fields.xlsx.
   Date: 2026-05-03

   Changes:
   - Creates lookup.ContactMethod, lookup.Severity, lookup.ResolutionCode
   - Adds 17 new columns to itil.Incident
   - Adds FK constraints for all new FK columns
   - Replaces itil.usp_CreateIncident to accept all new fields
   ---------------------------------------------------------------------------- */

/* 1. NEW LOOKUP TABLES */

CREATE TABLE lookup.ContactMethod (
    ContactMethodId TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(32)  NOT NULL UNIQUE,
    DisplayName     NVARCHAR(64) NOT NULL,
    SortOrder       TINYINT      NOT NULL
);

CREATE TABLE lookup.Severity (
    SeverityId      TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(32)  NOT NULL UNIQUE,
    DisplayName     NVARCHAR(64) NOT NULL,
    SortOrder       TINYINT      NOT NULL
);

CREATE TABLE lookup.ResolutionCode (
    ResolutionCodeId TINYINT     NOT NULL PRIMARY KEY,
    Code             VARCHAR(32) NOT NULL UNIQUE,
    DisplayName      NVARCHAR(64) NOT NULL,
    SortOrder        TINYINT      NOT NULL
);
GO

/* 2. SEED NEW LOOKUP TABLES */

INSERT INTO lookup.ContactMethod (ContactMethodId, Code, DisplayName, SortOrder) VALUES
    (1, 'portal',     'Portal',          1),
    (2, 'phone',      'Phone',           2),
    (3, 'email',      'Email',           3),
    (4, 'chat',       'Chat',            4),
    (5, 'monitoring', 'Monitoring Tool', 5);

INSERT INTO lookup.Severity (SeverityId, Code, DisplayName, SortOrder) VALUES
    (1, 'sev1', 'SEV-1 (Critical)', 1),
    (2, 'sev2', 'SEV-2 (High)',     2),
    (3, 'sev3', 'SEV-3 (Medium)',   3),
    (4, 'sev4', 'SEV-4 (Low)',      4);

INSERT INTO lookup.ResolutionCode (ResolutionCodeId, Code, DisplayName, SortOrder) VALUES
    (1, 'resolved',         'Resolved',         1),
    (2, 'workaround',       'Workaround',        2),
    (3, 'duplicate',        'Duplicate',         3),
    (4, 'cannot_reproduce', 'Cannot Reproduce',  4);
GO

/* 3. NEW COLUMNS ON itil.Incident */

-- Identification / Reporter
ALTER TABLE itil.Incident ADD CallerUserId            INT             NULL;
ALTER TABLE itil.Incident ADD ContactMethodId         TINYINT         NULL;
ALTER TABLE itil.Incident ADD Location                NVARCHAR(128)   NULL;

-- Classification
ALTER TABLE itil.Incident ADD SubCategoryId           INT             NULL;

-- Prioritization
ALTER TABLE itil.Incident ADD SeverityId              TINYINT         NULL;
ALTER TABLE itil.Incident ADD IsMajorIncident         BIT             NOT NULL DEFAULT 0;

-- Assignment tracking (auto-maintained)
ALTER TABLE itil.Incident ADD ReassignCount           INT             NOT NULL DEFAULT 0;

-- Resolution (required when resolving/closing)
ALTER TABLE itil.Incident ADD ResolutionCodeId        TINYINT         NULL;
ALTER TABLE itil.Incident ADD ResolutionNotes         NVARCHAR(MAX)   NULL;

-- SLA / Time Tracking (auto-tracked)
ALTER TABLE itil.Incident ADD SlaResponseTargetMinutes INT            NULL;
ALTER TABLE itil.Incident ADD FirstResponseAt         DATETIME2(3)    NULL;
ALTER TABLE itil.Incident ADD ReopenCount             INT             NOT NULL DEFAULT 0;

-- Relationships
ALTER TABLE itil.Incident ADD RelatedChangeId         BIGINT          NULL;
ALTER TABLE itil.Incident ADD RelatedKbArticleId      BIGINT          NULL;

-- Resolution / Quality metrics (auto-calculated or optional)
ALTER TABLE itil.Incident ADD CsatScore               TINYINT         NULL;
ALTER TABLE itil.Incident ADD IsFirstCallResolution   BIT             NULL;
ALTER TABLE itil.Incident ADD IsKbArticleCreated      BIT             NOT NULL DEFAULT 0;
GO

/* 4. NEW FK CONSTRAINTS */

ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_Caller           FOREIGN KEY (CallerUserId)        REFERENCES core.[User](UserId);
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_ContactMethod    FOREIGN KEY (ContactMethodId)     REFERENCES lookup.ContactMethod(ContactMethodId);
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_SubCategory      FOREIGN KEY (SubCategoryId)       REFERENCES lookup.SubCategory(SubCategoryId);
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_Severity         FOREIGN KEY (SeverityId)          REFERENCES lookup.Severity(SeverityId);
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_ResolutionCode   FOREIGN KEY (ResolutionCodeId)    REFERENCES lookup.ResolutionCode(ResolutionCodeId);
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_RelatedChange    FOREIGN KEY (RelatedChangeId)     REFERENCES itil.[Change](ChangeId);
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_RelatedKbArticle FOREIGN KEY (RelatedKbArticleId)  REFERENCES kb.Article(ArticleId);
GO

/* 5. REPLACE usp_CreateIncident WITH FULL FIELD SUPPORT */

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
    DECLARE @StatusId          TINYINT = (SELECT StatusId         FROM lookup.IncidentStatus   WHERE Code = 'new');
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

    -- pick SLA: the most specific policy wins (priority + category, else priority alone)
    DECLARE @SlaPolicyId INT, @SlaResolutionTarget INT, @SlaResponseTarget INT;
    SELECT TOP (1)
        @SlaPolicyId        = SlaPolicyId,
        @SlaResolutionTarget = ResolutionMinutes,
        @SlaResponseTarget  = ResponseMinutes
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
