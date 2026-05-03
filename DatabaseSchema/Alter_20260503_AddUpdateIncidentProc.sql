/* ----------------------------------------------------------------------------
   Alter_20260503_AddUpdateIncidentProc.sql
   Adds/replaces itil.usp_UpdateIncident to support full-field edits from the UI.
   Includes Impact and Urgency fields.
   Date: 2026-05-03
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

    UPDATE itil.Incident SET
        Title             = @Title,
        Description       = NULLIF(@Description,      ''),
        CallerUserId      = @CallerUserId,
        ContactMethodId   = @ContactMethodId,
        Location          = NULLIF(@Location,         ''),
        ServiceId         = @ServiceId,
        CategoryId        = @CategoryId,
        SubCategoryId     = @SubCategoryId,
        CiId              = @CiId,
        PriorityId        = ISNULL(@PriorityId,       PriorityId),
        ImpactId          = @ImpactId,
        UrgencyId         = @UrgencyId,
        SeverityId        = @SeverityId,
        IsMajorIncident   = @IsMajorIncident,
        GroupId           = @GroupId,
        AssigneeUserId    = @AssigneeUserId,
        ResolutionCodeId  = @ResolutionCodeId,
        ResolutionNotes   = NULLIF(@ResolutionNotes,  ''),
        UpdatedAt         = SYSUTCDATETIME()
    WHERE IncidentId = @IncidentId;

    INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, OccurredAt)
    VALUES ('INC', @IncidentId, @ActorUserId, 'updated', SYSUTCDATETIME());
END
GO
