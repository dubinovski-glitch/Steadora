/* ----------------------------------------------------------------------------
   Alter_20260503_IncidentFieldsExpansion_Fix.sql
   Fixes the failed portion of Alter_20260503_IncidentFieldsExpansion.sql.

   The original script stopped at line 103 because RelatedKbArticleId was
   declared INT but kb.Article.ArticleId is BIGINT. The column was already
   added as INT before the error. This script corrects it and adds all FKs.
   Date: 2026-05-03
   ---------------------------------------------------------------------------- */

-- 1. Drop and re-add RelatedKbArticleId with the correct type (BIGINT)
ALTER TABLE itil.Incident DROP COLUMN RelatedKbArticleId;
GO
ALTER TABLE itil.Incident ADD RelatedKbArticleId BIGINT NULL;
GO

-- 2. Add all FK constraints (none were created in the failed run)
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_Caller           FOREIGN KEY (CallerUserId)        REFERENCES core.[User](UserId);
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_ContactMethod    FOREIGN KEY (ContactMethodId)     REFERENCES lookup.ContactMethod(ContactMethodId);
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_SubCategory      FOREIGN KEY (SubCategoryId)       REFERENCES lookup.SubCategory(SubCategoryId);
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_Severity         FOREIGN KEY (SeverityId)          REFERENCES lookup.Severity(SeverityId);
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_ResolutionCode   FOREIGN KEY (ResolutionCodeId)    REFERENCES lookup.ResolutionCode(ResolutionCodeId);
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_RelatedChange    FOREIGN KEY (RelatedChangeId)     REFERENCES itil.[Change](ChangeId);
ALTER TABLE itil.Incident ADD CONSTRAINT FK_Inc_RelatedKbArticle FOREIGN KEY (RelatedKbArticleId)  REFERENCES kb.Article(ArticleId);
GO

-- 3. Replace usp_CreateIncident (was not reached in the failed run)
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
