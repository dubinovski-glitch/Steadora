/* ============================================================================
   Aperture ITSM — Microsoft SQL Server build script
   Target:    SQL Server 2019+ (uses sequences, JSON_VALUE, MERGE)
   Idempotent: drops the database if it already exists, then rebuilds
   Sections:
     0. Database creation
     1. Schemas
     2. Sequences
     3. Lookup tables + reference data
     4. Core tables (Users, Groups, Services, CIs)
     5. Ticket tables (Incidents, Problems, Changes)
     6. Knowledge base
     7. Activity / Comments / Watchers / Notifications
     8. Indexes
     9. Foreign keys
    10. Views
    11. Functions
    12. Stored procedures
    13. Triggers
    14. Seed data (mirrors prototype mock data)
   ============================================================================ */

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ----------------------------------------------------------------------------
   0. DATABASE
   ---------------------------------------------------------------------------- */
USE master;
GO

IF DB_ID(N'ApertureITSM') IS NOT NULL
BEGIN
    ALTER DATABASE ApertureITSM SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ApertureITSM;
END
GO

CREATE DATABASE ApertureITSM
COLLATE SQL_Latin1_General_CP1_CI_AS;
GO

ALTER DATABASE ApertureITSM SET RECOVERY SIMPLE;
ALTER DATABASE ApertureITSM SET READ_COMMITTED_SNAPSHOT ON;
ALTER DATABASE ApertureITSM SET ALLOW_SNAPSHOT_ISOLATION ON;
GO

USE ApertureITSM;
GO

/* ----------------------------------------------------------------------------
   1. SCHEMAS
   ---------------------------------------------------------------------------- */
CREATE SCHEMA core      AUTHORIZATION dbo;       -- users, groups, services, CIs
GO
CREATE SCHEMA itil      AUTHORIZATION dbo;       -- incidents, problems, changes
GO
CREATE SCHEMA kb        AUTHORIZATION dbo;       -- knowledge base
GO
CREATE SCHEMA audit     AUTHORIZATION dbo;       -- activity log, comments, notifications
GO
CREATE SCHEMA lookup    AUTHORIZATION dbo;       -- enum-style reference tables
GO
CREATE SCHEMA reporting AUTHORIZATION dbo;       -- views & analytics
GO

/* ----------------------------------------------------------------------------
   2. SEQUENCES — for human-readable record IDs (INC-104821 etc.)
   ---------------------------------------------------------------------------- */
CREATE SEQUENCE itil.IncidentSeq AS BIGINT START WITH 104822 INCREMENT BY 1 NO CACHE;
CREATE SEQUENCE itil.ChangeSeq   AS BIGINT START WITH   3222 INCREMENT BY 1 NO CACHE;
CREATE SEQUENCE itil.ProblemSeq  AS BIGINT START WITH    422 INCREMENT BY 1 NO CACHE;
CREATE SEQUENCE kb.ArticleSeq    AS BIGINT START WITH    143 INCREMENT BY 1 NO CACHE;
GO

/* ----------------------------------------------------------------------------
   3. LOOKUP TABLES
   ---------------------------------------------------------------------------- */
CREATE TABLE lookup.Priority (
    PriorityId      TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(16)  NOT NULL UNIQUE,            -- 'critical','high','medium','low'
    DisplayName     NVARCHAR(32) NOT NULL,
    SortOrder       TINYINT      NOT NULL,
    DefaultResponseMin   INT     NOT NULL,                   -- minutes
    DefaultResolutionMin INT     NOT NULL                    -- minutes
);

CREATE TABLE lookup.IncidentStatus (
    StatusId        TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(16)  NOT NULL UNIQUE,            -- 'new','progress','pending','resolved','closed'
    DisplayName     NVARCHAR(32) NOT NULL,
    IsTerminal      BIT          NOT NULL DEFAULT 0,
    PausesSla       BIT          NOT NULL DEFAULT 0,
    SortOrder       TINYINT      NOT NULL
);

CREATE TABLE lookup.ProblemState (
    StateId         TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(32)  NOT NULL UNIQUE,
    DisplayName     NVARCHAR(64) NOT NULL,
    SortOrder       TINYINT      NOT NULL,
    IsTerminal      BIT          NOT NULL DEFAULT 0
);

CREATE TABLE lookup.ChangeState (
    StateId         TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(32)  NOT NULL UNIQUE,
    DisplayName     NVARCHAR(64) NOT NULL,
    SortOrder       TINYINT      NOT NULL,
    IsTerminal      BIT          NOT NULL DEFAULT 0
);

CREATE TABLE lookup.ChangeType (
    ChangeTypeId    TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(16)  NOT NULL UNIQUE,            -- 'normal','standard','emergency'
    DisplayName     NVARCHAR(32) NOT NULL,
    SortOrder       TINYINT      NOT NULL
);

CREATE TABLE lookup.Risk (
    RiskId          TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(16)  NOT NULL UNIQUE,            -- 'low','medium','high'
    DisplayName     NVARCHAR(32) NOT NULL,
    SortOrder       TINYINT      NOT NULL
);

CREATE TABLE lookup.Impact (
    ImpactId        TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(16)  NOT NULL UNIQUE,
    DisplayName     NVARCHAR(32) NOT NULL,
    SortOrder       TINYINT      NOT NULL
);

CREATE TABLE lookup.Urgency (
    UrgencyId       TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(16)  NOT NULL UNIQUE,
    DisplayName     NVARCHAR(32) NOT NULL,
    SortOrder       TINYINT      NOT NULL
);

CREATE TABLE lookup.Role (
    RoleId          TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(16)  NOT NULL UNIQUE,            -- 'requester','agent','manager','admin'
    DisplayName     NVARCHAR(32) NOT NULL
);

CREATE TABLE lookup.Category (
    CategoryId      INT          NOT NULL IDENTITY(1,1) PRIMARY KEY,
    Code            VARCHAR(32)  NOT NULL UNIQUE,
    DisplayName     NVARCHAR(64) NOT NULL,
    SortOrder       INT          NOT NULL DEFAULT 100
);

CREATE TABLE lookup.ServiceHealth (
    HealthId        TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(16)  NOT NULL UNIQUE,            -- 'healthy','degraded','incident'
    DisplayName     NVARCHAR(32) NOT NULL
);

CREATE TABLE lookup.ApprovalVote (
    VoteId          TINYINT      NOT NULL PRIMARY KEY,
    Code            VARCHAR(16)  NOT NULL UNIQUE,            -- 'pending','approve','reject'
    DisplayName     NVARCHAR(32) NOT NULL
);
GO

/* ----------------------------------------------------------------------------
   4. CORE TABLES
   ---------------------------------------------------------------------------- */
CREATE TABLE core.[Group] (
    GroupId         INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
    Slug            VARCHAR(64)     NOT NULL UNIQUE,
    Name            NVARCHAR(128)   NOT NULL,
    Description     NVARCHAR(512)   NULL,
    IsActive        BIT             NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE core.[User] (
    UserId          INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
    ExternalId      VARCHAR(64)     NOT NULL UNIQUE,         -- e.g. 'u1','me' (matches prototype)
    Email           NVARCHAR(256)   NOT NULL UNIQUE,
    DisplayName     NVARCHAR(128)   NOT NULL,
    Title           NVARCHAR(128)   NULL,
    AvatarInitials  NVARCHAR(4)     NULL,
    AvatarColor     VARCHAR(16)     NULL,
    RoleId          TINYINT         NOT NULL,
    PrimaryGroupId  INT             NULL,
    IsActive        BIT             NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE core.Service (
    ServiceId       INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
    Slug            VARCHAR(64)     NOT NULL UNIQUE,
    Name            NVARCHAR(128)   NOT NULL,
    CategoryId      INT             NULL,
    OwningGroupId   INT             NULL,
    HealthId        TINYINT         NOT NULL DEFAULT 1,      -- healthy
    Description     NVARCHAR(512)   NULL,
    IsActive        BIT             NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE core.ConfigurationItem (
    CiId            INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
    AssetTag        VARCHAR(64)     NOT NULL UNIQUE,         -- e.g. 'EXCH-NL-01'
    Name            NVARCHAR(128)   NOT NULL,
    Type            NVARCHAR(64)    NOT NULL,                -- 'Mail server','Firewall'…
    Environment     NVARCHAR(32)    NULL,                    -- Production / Staging / Dev
    Region          NVARCHAR(32)    NULL,
    OwnerUserId     INT             NULL,
    IsActive        BIT             NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE core.SlaPolicy (
    SlaPolicyId     INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
    Name            NVARCHAR(128)   NOT NULL,
    PriorityId      TINYINT         NOT NULL,
    CategoryId      INT             NULL,                    -- NULL = applies to all categories
    ResponseMinutes INT             NOT NULL,
    ResolutionMinutes INT           NOT NULL,
    BusinessHoursOnly BIT           NOT NULL DEFAULT 0,
    IsActive        BIT             NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* ----------------------------------------------------------------------------
   5. ITIL TABLES
   ---------------------------------------------------------------------------- */
CREATE TABLE itil.Incident (
    IncidentId      BIGINT          NOT NULL PRIMARY KEY,    -- numeric form of INC id
    Number          AS  ('INC-' + RIGHT('000000' + CAST(IncidentId AS VARCHAR(20)), 6)) PERSISTED,
    Title           NVARCHAR(256)   NOT NULL,
    Description     NVARCHAR(MAX)   NULL,
    StepsToReproduce NVARCHAR(MAX)  NULL,

    PriorityId      TINYINT         NOT NULL,
    StatusId        TINYINT         NOT NULL,
    ImpactId        TINYINT         NULL,
    UrgencyId       TINYINT         NULL,
    CategoryId      INT             NULL,

    ServiceId       INT             NULL,
    CiId            INT             NULL,

    ReporterUserId  INT             NULL,
    ReporterDisplay NVARCHAR(128)   NULL,                    -- non-user reporters (bots, externals)
    AssigneeUserId  INT             NULL,
    GroupId         INT             NULL,

    SlaPolicyId     INT             NULL,
    SlaTargetMinutes INT            NULL,
    SlaStartedAt    DATETIME2(3)    NULL,
    SlaPausedSeconds INT            NOT NULL DEFAULT 0,
    SlaPausedAt     DATETIME2(3)    NULL,
    SlaBreachedAt   DATETIME2(3)    NULL,
    SlaWarnedAt     DATETIME2(3)    NULL,

    OpenedAt        DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    ResolvedAt      DATETIME2(3)    NULL,
    ClosedAt        DATETIME2(3)    NULL,

    ParentProblemId BIGINT          NULL,

    CreatedBy       INT             NULL,
    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    DeletedAt       DATETIME2(3)    NULL,
    RowVersion      ROWVERSION      NOT NULL
);

CREATE TABLE itil.Problem (
    ProblemId       BIGINT          NOT NULL PRIMARY KEY,
    Number          AS ('PRB-' + RIGHT('0000' + CAST(ProblemId AS VARCHAR(20)), 4)) PERSISTED,
    Title           NVARCHAR(256)   NOT NULL,
    RootCause       NVARCHAR(MAX)   NULL,
    Workaround      NVARCHAR(MAX)   NULL,

    PriorityId      TINYINT         NOT NULL,
    StateId         TINYINT         NOT NULL,
    IsKnownError    BIT             NOT NULL DEFAULT 0,

    AssigneeUserId  INT             NULL,
    GroupId         INT             NULL,

    OpenedAt        DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    ResolvedAt      DATETIME2(3)    NULL,

    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    DeletedAt       DATETIME2(3)    NULL,
    RowVersion      ROWVERSION      NOT NULL
);

CREATE TABLE itil.ProblemService (
    ProblemId       BIGINT          NOT NULL,
    ServiceId       INT             NOT NULL,
    PRIMARY KEY (ProblemId, ServiceId)
);

CREATE TABLE itil.[Change] (
    ChangeId        BIGINT          NOT NULL PRIMARY KEY,
    Number          AS ('CHG-' + RIGHT('0000' + CAST(ChangeId AS VARCHAR(20)), 4)) PERSISTED,
    Title           NVARCHAR(256)   NOT NULL,
    Description     NVARCHAR(MAX)   NULL,
    RolloutPlan     NVARCHAR(MAX)   NULL,
    RollbackPlan    NVARCHAR(MAX)   NULL,
    ImpactNotes     NVARCHAR(512)   NULL,

    ChangeTypeId    TINYINT         NOT NULL,
    RiskId          TINYINT         NOT NULL,
    StateId         TINYINT         NOT NULL,

    OwnerUserId     INT             NULL,
    ApproverUserId  INT             NULL,
    GroupId         INT             NULL,

    CabName         NVARCHAR(64)    NULL,                    -- 'CAB-2026-W18','ECAB','Pre-approved'
    ScheduledStart  DATETIME2(3)    NULL,
    ScheduledEnd    DATETIME2(3)    NULL,
    DowntimeEstimate NVARCHAR(64)   NULL,

    SubmittedAt     DATETIME2(3)    NULL,
    ApprovedAt      DATETIME2(3)    NULL,
    CompletedAt     DATETIME2(3)    NULL,

    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    DeletedAt       DATETIME2(3)    NULL,
    RowVersion      ROWVERSION      NOT NULL
);

CREATE TABLE itil.ChangeService (
    ChangeId        BIGINT          NOT NULL,
    ServiceId       INT             NOT NULL,
    PRIMARY KEY (ChangeId, ServiceId)
);

CREATE TABLE itil.ChangeReviewer (
    ChangeReviewerId BIGINT         NOT NULL IDENTITY(1,1) PRIMARY KEY,
    ChangeId        BIGINT          NOT NULL,
    UserId          INT             NOT NULL,
    VoteId          TINYINT         NOT NULL DEFAULT 1,      -- pending
    Comment         NVARCHAR(1024)  NULL,
    VotedAt         DATETIME2(3)    NULL,
    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_ChangeReviewer UNIQUE (ChangeId, UserId)
);

CREATE TABLE itil.IncidentLink (
    IncidentLinkId  BIGINT          NOT NULL IDENTITY(1,1) PRIMARY KEY,
    IncidentId      BIGINT          NOT NULL,
    LinkedType      VARCHAR(8)      NOT NULL,                -- 'INC','PRB','CHG','KB'
    LinkedId        BIGINT          NOT NULL,
    LinkKind        VARCHAR(32)     NOT NULL DEFAULT 'related', -- 'related','duplicate','caused_by','resolves'
    CreatedBy       INT             NULL,
    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_IncidentLink UNIQUE (IncidentId, LinkedType, LinkedId)
);
GO

/* ----------------------------------------------------------------------------
   6. KNOWLEDGE BASE
   ---------------------------------------------------------------------------- */
CREATE TABLE kb.Category (
    KbCategoryId    INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
    Slug            VARCHAR(32)     NOT NULL UNIQUE,
    DisplayName     NVARCHAR(64)    NOT NULL,
    Icon            VARCHAR(32)     NULL,
    SortOrder       INT             NOT NULL DEFAULT 100
);

CREATE TABLE kb.Article (
    ArticleId       BIGINT          NOT NULL PRIMARY KEY,
    Number          AS ('KB-' + RIGHT('0000' + CAST(ArticleId AS VARCHAR(20)), 4)) PERSISTED,
    Title           NVARCHAR(256)   NOT NULL,
    Snippet         NVARCHAR(1024)  NULL,
    Body            NVARCHAR(MAX)   NULL,                    -- markdown
    KbCategoryId    INT             NOT NULL,
    AuthorUserId    INT             NULL,
    Status          VARCHAR(16)     NOT NULL DEFAULT 'published',  -- draft / published / archived
    Pinned          BIT             NOT NULL DEFAULT 0,
    Views           INT             NOT NULL DEFAULT 0,
    HelpfulCount    INT             NOT NULL DEFAULT 0,
    NotHelpfulCount INT             NOT NULL DEFAULT 0,
    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    DeletedAt       DATETIME2(3)    NULL,
    RowVersion      ROWVERSION      NOT NULL
);

CREATE TABLE kb.Tag (
    TagId           INT             NOT NULL IDENTITY(1,1) PRIMARY KEY,
    Slug            VARCHAR(64)     NOT NULL UNIQUE,
    DisplayName     NVARCHAR(64)    NOT NULL
);

CREATE TABLE kb.ArticleTag (
    ArticleId       BIGINT          NOT NULL,
    TagId           INT             NOT NULL,
    PRIMARY KEY (ArticleId, TagId)
);
GO

/* ----------------------------------------------------------------------------
   7. ACTIVITY / COMMENTS / WATCHERS / NOTIFICATIONS
   ---------------------------------------------------------------------------- */
CREATE TABLE audit.Comment (
    CommentId       BIGINT          NOT NULL IDENTITY(1,1) PRIMARY KEY,
    ParentType      VARCHAR(8)      NOT NULL,                -- 'INC','PRB','CHG'
    ParentId        BIGINT          NOT NULL,
    AuthorUserId    INT             NULL,
    AuthorDisplay   NVARCHAR(128)   NULL,
    Body            NVARCHAR(MAX)   NOT NULL,                -- markdown
    Internal        BIT             NOT NULL DEFAULT 0,
    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    EditedAt        DATETIME2(3)    NULL,
    DeletedAt       DATETIME2(3)    NULL
);

CREATE TABLE audit.ActivityEvent (
    ActivityId      BIGINT          NOT NULL IDENTITY(1,1) PRIMARY KEY,
    ParentType      VARCHAR(8)      NOT NULL,
    ParentId        BIGINT          NOT NULL,
    ActorUserId     INT             NULL,
    Kind            VARCHAR(32)     NOT NULL,                -- created/commented/field_changed/...
    Field           VARCHAR(64)     NULL,
    OldValue        NVARCHAR(512)   NULL,
    NewValue        NVARCHAR(512)   NULL,
    DataJson        NVARCHAR(MAX)   NULL,
    OccurredAt      DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE audit.Watcher (
    ParentType      VARCHAR(8)      NOT NULL,
    ParentId        BIGINT          NOT NULL,
    UserId          INT             NOT NULL,
    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (ParentType, ParentId, UserId)
);

CREATE TABLE audit.Notification (
    NotificationId  BIGINT          NOT NULL IDENTITY(1,1) PRIMARY KEY,
    UserId          INT             NOT NULL,
    ParentType      VARCHAR(8)      NOT NULL,
    ParentId        BIGINT          NOT NULL,
    Kind            VARCHAR(32)     NOT NULL,                -- mention, sla_warning, status, comment
    Message         NVARCHAR(512)   NULL,
    ReadAt          DATETIME2(3)    NULL,
    CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* ----------------------------------------------------------------------------
   8. INDEXES
   ---------------------------------------------------------------------------- */
-- Incident: hot-path queue and SLA indexes
CREATE INDEX IX_Incident_Status_Priority      ON itil.Incident (StatusId, PriorityId)            INCLUDE (Title, AssigneeUserId, GroupId, OpenedAt) WHERE DeletedAt IS NULL;
CREATE INDEX IX_Incident_Assignee             ON itil.Incident (AssigneeUserId)                  INCLUDE (StatusId, PriorityId, OpenedAt) WHERE DeletedAt IS NULL;
CREATE INDEX IX_Incident_Group                ON itil.Incident (GroupId)                         INCLUDE (StatusId, PriorityId) WHERE DeletedAt IS NULL;
CREATE INDEX IX_Incident_OpenedAt             ON itil.Incident (OpenedAt DESC);
CREATE INDEX IX_Incident_UpdatedAt            ON itil.Incident (UpdatedAt DESC);
CREATE INDEX IX_Incident_SlaBreach            ON itil.Incident (SlaBreachedAt) WHERE SlaBreachedAt IS NOT NULL;
CREATE INDEX IX_Incident_ParentProblem        ON itil.Incident (ParentProblemId) WHERE ParentProblemId IS NOT NULL;
CREATE INDEX IX_Incident_Service              ON itil.Incident (ServiceId) WHERE ServiceId IS NOT NULL;

-- Problem
CREATE INDEX IX_Problem_State                 ON itil.Problem (StateId)                          INCLUDE (PriorityId, AssigneeUserId, OpenedAt) WHERE DeletedAt IS NULL;
CREATE INDEX IX_Problem_Assignee              ON itil.Problem (AssigneeUserId) WHERE DeletedAt IS NULL;

-- Change
CREATE INDEX IX_Change_State                  ON itil.[Change] (StateId)                         INCLUDE (RiskId, ScheduledStart, ScheduledEnd) WHERE DeletedAt IS NULL;
CREATE INDEX IX_Change_ScheduledStart         ON itil.[Change] (ScheduledStart);
CREATE INDEX IX_Change_Approver               ON itil.[Change] (ApproverUserId) WHERE DeletedAt IS NULL;

-- Activity / comments — read-by-parent is the dominant pattern
CREATE INDEX IX_ActivityEvent_Parent          ON audit.ActivityEvent (ParentType, ParentId, OccurredAt DESC);
CREATE INDEX IX_Comment_Parent                ON audit.Comment       (ParentType, ParentId, CreatedAt DESC) WHERE DeletedAt IS NULL;

-- Notifications — unread feed by user
CREATE INDEX IX_Notification_User_Unread      ON audit.Notification (UserId, CreatedAt DESC) WHERE ReadAt IS NULL;

-- KB
CREATE INDEX IX_Article_Category              ON kb.Article (KbCategoryId) WHERE DeletedAt IS NULL;
CREATE INDEX IX_Article_Pinned                ON kb.Article (Pinned) WHERE Pinned = 1 AND DeletedAt IS NULL;

-- Configuration items
CREATE INDEX IX_CI_Owner                      ON core.ConfigurationItem (OwnerUserId);
GO

/* ----------------------------------------------------------------------------
   9. FOREIGN KEYS
   ---------------------------------------------------------------------------- */
-- core
ALTER TABLE core.[User]               ADD CONSTRAINT FK_User_Role            FOREIGN KEY (RoleId)         REFERENCES lookup.Role(RoleId);
ALTER TABLE core.[User]               ADD CONSTRAINT FK_User_PrimaryGroup    FOREIGN KEY (PrimaryGroupId) REFERENCES core.[Group](GroupId);
ALTER TABLE core.Service              ADD CONSTRAINT FK_Service_Category     FOREIGN KEY (CategoryId)     REFERENCES lookup.Category(CategoryId);
ALTER TABLE core.Service              ADD CONSTRAINT FK_Service_Group        FOREIGN KEY (OwningGroupId)  REFERENCES core.[Group](GroupId);
ALTER TABLE core.Service              ADD CONSTRAINT FK_Service_Health       FOREIGN KEY (HealthId)       REFERENCES lookup.ServiceHealth(HealthId);
ALTER TABLE core.ConfigurationItem    ADD CONSTRAINT FK_CI_Owner             FOREIGN KEY (OwnerUserId)    REFERENCES core.[User](UserId);
ALTER TABLE core.SlaPolicy            ADD CONSTRAINT FK_SlaPolicy_Priority   FOREIGN KEY (PriorityId)     REFERENCES lookup.Priority(PriorityId);
ALTER TABLE core.SlaPolicy            ADD CONSTRAINT FK_SlaPolicy_Category   FOREIGN KEY (CategoryId)     REFERENCES lookup.Category(CategoryId);

-- itil.Incident
ALTER TABLE itil.Incident             ADD CONSTRAINT FK_Inc_Priority         FOREIGN KEY (PriorityId)      REFERENCES lookup.Priority(PriorityId);
ALTER TABLE itil.Incident             ADD CONSTRAINT FK_Inc_Status           FOREIGN KEY (StatusId)        REFERENCES lookup.IncidentStatus(StatusId);
ALTER TABLE itil.Incident             ADD CONSTRAINT FK_Inc_Impact           FOREIGN KEY (ImpactId)        REFERENCES lookup.Impact(ImpactId);
ALTER TABLE itil.Incident             ADD CONSTRAINT FK_Inc_Urgency          FOREIGN KEY (UrgencyId)       REFERENCES lookup.Urgency(UrgencyId);
ALTER TABLE itil.Incident             ADD CONSTRAINT FK_Inc_Category         FOREIGN KEY (CategoryId)      REFERENCES lookup.Category(CategoryId);
ALTER TABLE itil.Incident             ADD CONSTRAINT FK_Inc_Service          FOREIGN KEY (ServiceId)       REFERENCES core.Service(ServiceId);
ALTER TABLE itil.Incident             ADD CONSTRAINT FK_Inc_CI               FOREIGN KEY (CiId)            REFERENCES core.ConfigurationItem(CiId);
ALTER TABLE itil.Incident             ADD CONSTRAINT FK_Inc_Reporter         FOREIGN KEY (ReporterUserId)  REFERENCES core.[User](UserId);
ALTER TABLE itil.Incident             ADD CONSTRAINT FK_Inc_Assignee         FOREIGN KEY (AssigneeUserId)  REFERENCES core.[User](UserId);
ALTER TABLE itil.Incident             ADD CONSTRAINT FK_Inc_Group            FOREIGN KEY (GroupId)         REFERENCES core.[Group](GroupId);
ALTER TABLE itil.Incident             ADD CONSTRAINT FK_Inc_SlaPolicy        FOREIGN KEY (SlaPolicyId)     REFERENCES core.SlaPolicy(SlaPolicyId);
ALTER TABLE itil.Incident             ADD CONSTRAINT FK_Inc_ParentProblem    FOREIGN KEY (ParentProblemId) REFERENCES itil.Problem(ProblemId);

-- itil.Problem
ALTER TABLE itil.Problem              ADD CONSTRAINT FK_Prb_Priority         FOREIGN KEY (PriorityId)     REFERENCES lookup.Priority(PriorityId);
ALTER TABLE itil.Problem              ADD CONSTRAINT FK_Prb_State            FOREIGN KEY (StateId)        REFERENCES lookup.ProblemState(StateId);
ALTER TABLE itil.Problem              ADD CONSTRAINT FK_Prb_Assignee         FOREIGN KEY (AssigneeUserId) REFERENCES core.[User](UserId);
ALTER TABLE itil.Problem              ADD CONSTRAINT FK_Prb_Group            FOREIGN KEY (GroupId)        REFERENCES core.[Group](GroupId);
ALTER TABLE itil.ProblemService       ADD CONSTRAINT FK_PrbSvc_Problem       FOREIGN KEY (ProblemId)      REFERENCES itil.Problem(ProblemId) ON DELETE CASCADE;
ALTER TABLE itil.ProblemService       ADD CONSTRAINT FK_PrbSvc_Service       FOREIGN KEY (ServiceId)      REFERENCES core.Service(ServiceId);

-- itil.Change
ALTER TABLE itil.[Change]             ADD CONSTRAINT FK_Chg_Type             FOREIGN KEY (ChangeTypeId)   REFERENCES lookup.ChangeType(ChangeTypeId);
ALTER TABLE itil.[Change]             ADD CONSTRAINT FK_Chg_Risk             FOREIGN KEY (RiskId)         REFERENCES lookup.Risk(RiskId);
ALTER TABLE itil.[Change]             ADD CONSTRAINT FK_Chg_State            FOREIGN KEY (StateId)        REFERENCES lookup.ChangeState(StateId);
ALTER TABLE itil.[Change]             ADD CONSTRAINT FK_Chg_Owner            FOREIGN KEY (OwnerUserId)    REFERENCES core.[User](UserId);
ALTER TABLE itil.[Change]             ADD CONSTRAINT FK_Chg_Approver         FOREIGN KEY (ApproverUserId) REFERENCES core.[User](UserId);
ALTER TABLE itil.[Change]             ADD CONSTRAINT FK_Chg_Group            FOREIGN KEY (GroupId)        REFERENCES core.[Group](GroupId);
ALTER TABLE itil.ChangeService        ADD CONSTRAINT FK_ChgSvc_Change        FOREIGN KEY (ChangeId)       REFERENCES itil.[Change](ChangeId) ON DELETE CASCADE;
ALTER TABLE itil.ChangeService        ADD CONSTRAINT FK_ChgSvc_Service       FOREIGN KEY (ServiceId)      REFERENCES core.Service(ServiceId);
ALTER TABLE itil.ChangeReviewer       ADD CONSTRAINT FK_ChgRev_Change        FOREIGN KEY (ChangeId)       REFERENCES itil.[Change](ChangeId) ON DELETE CASCADE;
ALTER TABLE itil.ChangeReviewer       ADD CONSTRAINT FK_ChgRev_User          FOREIGN KEY (UserId)         REFERENCES core.[User](UserId);
ALTER TABLE itil.ChangeReviewer       ADD CONSTRAINT FK_ChgRev_Vote          FOREIGN KEY (VoteId)         REFERENCES lookup.ApprovalVote(VoteId);

-- itil.IncidentLink
ALTER TABLE itil.IncidentLink         ADD CONSTRAINT FK_IncLink_Incident     FOREIGN KEY (IncidentId)     REFERENCES itil.Incident(IncidentId) ON DELETE CASCADE;

-- kb
ALTER TABLE kb.Article                ADD CONSTRAINT FK_Article_Category     FOREIGN KEY (KbCategoryId)   REFERENCES kb.Category(KbCategoryId);
ALTER TABLE kb.Article                ADD CONSTRAINT FK_Article_Author       FOREIGN KEY (AuthorUserId)   REFERENCES core.[User](UserId);
ALTER TABLE kb.ArticleTag             ADD CONSTRAINT FK_ArticleTag_Article   FOREIGN KEY (ArticleId)      REFERENCES kb.Article(ArticleId) ON DELETE CASCADE;
ALTER TABLE kb.ArticleTag             ADD CONSTRAINT FK_ArticleTag_Tag       FOREIGN KEY (TagId)          REFERENCES kb.Tag(TagId);

-- audit
ALTER TABLE audit.Comment             ADD CONSTRAINT FK_Comment_Author       FOREIGN KEY (AuthorUserId)   REFERENCES core.[User](UserId);
ALTER TABLE audit.ActivityEvent       ADD CONSTRAINT FK_Activity_Actor       FOREIGN KEY (ActorUserId)    REFERENCES core.[User](UserId);
ALTER TABLE audit.Watcher             ADD CONSTRAINT FK_Watcher_User         FOREIGN KEY (UserId)         REFERENCES core.[User](UserId);
ALTER TABLE audit.Notification        ADD CONSTRAINT FK_Notif_User           FOREIGN KEY (UserId)         REFERENCES core.[User](UserId);
GO

/* ----------------------------------------------------------------------------
   10. VIEWS
   ---------------------------------------------------------------------------- */
GO
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
        AS DECIMAL(5,1))
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

CREATE OR ALTER VIEW reporting.vSlaBreaching AS
SELECT *
FROM reporting.vIncidentDetail
WHERE IsTerminalStatus = 0
  AND (SlaPercent >= 80.0 OR SlaBreachedAt IS NOT NULL);
GO

CREATE OR ALTER VIEW reporting.vIncidentVolumeDaily AS
SELECT
    CONVERT(date, OpenedAt)            AS BucketDate,
    COUNT(*)                           AS OpenedCount,
    SUM(CASE WHEN ResolvedAt IS NOT NULL
              AND CONVERT(date, ResolvedAt) = CONVERT(date, OpenedAt) THEN 1 ELSE 0 END) AS SameDayResolved
FROM itil.Incident
WHERE DeletedAt IS NULL
GROUP BY CONVERT(date, OpenedAt);
GO

CREATE OR ALTER VIEW reporting.vSlaByPriority AS
SELECT
    pr.Code                                AS Priority,
    pr.DefaultResolutionMin                AS TargetMinutes,
    COUNT(*)                               AS TotalIncidents,
    SUM(CASE WHEN i.SlaBreachedAt IS NULL THEN 1 ELSE 0 END) AS MetCount,
    SUM(CASE WHEN i.SlaBreachedAt IS NOT NULL THEN 1 ELSE 0 END) AS BreachedCount,
    CAST(100.0 * SUM(CASE WHEN i.SlaBreachedAt IS NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0) AS DECIMAL(5,2)) AS PctMet
FROM itil.Incident i
JOIN lookup.Priority pr ON pr.PriorityId = i.PriorityId
WHERE i.DeletedAt IS NULL
GROUP BY pr.Code, pr.DefaultResolutionMin, pr.SortOrder;
GO

CREATE OR ALTER VIEW reporting.vTeamLoad AS
SELECT
    g.Name                                  AS TeamName,
    COUNT(*)                                AS OpenIncidents,
    SUM(CASE WHEN i.SlaBreachedAt IS NULL THEN 1 ELSE 0 END) AS MetSla,
    SUM(CASE WHEN i.SlaBreachedAt IS NOT NULL THEN 1 ELSE 0 END) AS Breaches,
    CAST(100.0 * SUM(CASE WHEN i.SlaBreachedAt IS NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0) AS DECIMAL(5,2)) AS PctMet
FROM itil.Incident i
JOIN core.[Group] g ON g.GroupId = i.GroupId
JOIN lookup.IncidentStatus s ON s.StatusId = i.StatusId AND s.IsTerminal = 0
WHERE i.DeletedAt IS NULL
GROUP BY g.Name;
GO

CREATE OR ALTER VIEW reporting.vChangeApprovalQueue AS
SELECT
    c.ChangeId,
    c.Number                  AS ChangeNumber,
    c.Title,
    cs.Code                   AS [State],
    rk.Code                   AS Risk,
    ct.Code                   AS ChangeType,
    c.ScheduledStart,
    c.ScheduledEnd,
    o.DisplayName             AS OwnerName,
    a.DisplayName             AS ApproverName,
    (SELECT COUNT(*) FROM itil.ChangeReviewer r WHERE r.ChangeId = c.ChangeId) AS ReviewerCount,
    (SELECT COUNT(*) FROM itil.ChangeReviewer r
       JOIN lookup.ApprovalVote v ON v.VoteId = r.VoteId
       WHERE r.ChangeId = c.ChangeId AND v.Code = 'approve') AS ApproveVotes,
    (SELECT COUNT(*) FROM itil.ChangeReviewer r
       JOIN lookup.ApprovalVote v ON v.VoteId = r.VoteId
       WHERE r.ChangeId = c.ChangeId AND v.Code = 'reject') AS RejectVotes
FROM itil.[Change] c
JOIN lookup.ChangeState cs ON cs.StateId = c.StateId
JOIN lookup.Risk        rk ON rk.RiskId  = c.RiskId
JOIN lookup.ChangeType  ct ON ct.ChangeTypeId = c.ChangeTypeId
LEFT JOIN core.[User]   o  ON o.UserId = c.OwnerUserId
LEFT JOIN core.[User]   a  ON a.UserId = c.ApproverUserId
WHERE c.DeletedAt IS NULL;
GO

/* ----------------------------------------------------------------------------
   11. FUNCTIONS
   ---------------------------------------------------------------------------- */
GO
CREATE OR ALTER FUNCTION dbo.fn_SlaPercent
(
    @Target INT,
    @StartedAt DATETIME2(3),
    @ResolvedAt DATETIME2(3),
    @PausedSec INT
)
RETURNS DECIMAL(6,2)
WITH SCHEMABINDING
AS
BEGIN
    IF @Target IS NULL OR @StartedAt IS NULL OR @Target = 0 RETURN NULL;
    DECLARE @elapsedMin INT =
        DATEDIFF(MINUTE, @StartedAt, ISNULL(@ResolvedAt, SYSUTCDATETIME()))
      - ISNULL(@PausedSec, 0) / 60;
    RETURN CAST(100.0 * @elapsedMin / @Target AS DECIMAL(6,2));
END
GO

-- NOTE: SQL Server does NOT allow NEXT VALUE FOR inside a user-defined function.
-- A wrapper is provided as a stored procedure instead. Callers that need the
-- next id should either:
--   (a) consume the sequence inline:  SET @Id = NEXT VALUE FOR itil.IncidentSeq;
--   (b) call the procedure below:     EXEC itil.usp_NextIncidentId @Id OUTPUT;
GO
CREATE OR ALTER PROCEDURE itil.usp_NextIncidentId
    @NextId BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @NextId = NEXT VALUE FOR itil.IncidentSeq;
END
GO

/* ----------------------------------------------------------------------------
   12. STORED PROCEDURES
   ---------------------------------------------------------------------------- */
GO
CREATE OR ALTER PROCEDURE itil.usp_CreateIncident
    @Title           NVARCHAR(256),
    @Description     NVARCHAR(MAX) = NULL,
    @PriorityCode    VARCHAR(16),
    @CategoryCode    VARCHAR(32) = NULL,
    @ServiceSlug     VARCHAR(64) = NULL,
    @CiAssetTag      VARCHAR(64) = NULL,
    @ReporterExtId   VARCHAR(64) = NULL,
    @ReporterDisplay NVARCHAR(128) = NULL,
    @AssigneeExtId   VARCHAR(64) = NULL,
    @GroupSlug       VARCHAR(64) = NULL,
    @ImpactCode      VARCHAR(16) = NULL,
    @UrgencyCode     VARCHAR(16) = NULL,
    @CreatedByExtId  VARCHAR(64) = NULL,
    @NewIncidentId   BIGINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @PriorityId TINYINT       = (SELECT PriorityId FROM lookup.Priority         WHERE Code = @PriorityCode);
    DECLARE @StatusId   TINYINT       = (SELECT StatusId   FROM lookup.IncidentStatus   WHERE Code = 'new');
    DECLARE @CategoryId INT           = (SELECT CategoryId FROM lookup.Category         WHERE Code = @CategoryCode);
    DECLARE @ServiceId  INT           = (SELECT ServiceId  FROM core.Service            WHERE Slug = @ServiceSlug);
    DECLARE @CiId       INT           = (SELECT CiId       FROM core.ConfigurationItem  WHERE AssetTag = @CiAssetTag);
    DECLARE @ImpactId   TINYINT       = (SELECT ImpactId   FROM lookup.Impact           WHERE Code = @ImpactCode);
    DECLARE @UrgencyId  TINYINT       = (SELECT UrgencyId  FROM lookup.Urgency          WHERE Code = @UrgencyCode);
    DECLARE @GroupId    INT           = (SELECT GroupId    FROM core.[Group]            WHERE Slug = @GroupSlug);

    DECLARE @ReporterUserId INT       = (SELECT UserId FROM core.[User] WHERE ExternalId = @ReporterExtId);
    DECLARE @AssigneeUserId INT       = (SELECT UserId FROM core.[User] WHERE ExternalId = @AssigneeExtId);
    DECLARE @CreatedById    INT       = (SELECT UserId FROM core.[User] WHERE ExternalId = @CreatedByExtId);

    IF @PriorityId IS NULL
        THROW 50001, 'Invalid priority code', 1;

    -- pick SLA: the most specific policy wins (priority + category, else priority alone)
    DECLARE @SlaPolicyId INT, @SlaTarget INT;
    SELECT TOP (1) @SlaPolicyId = SlaPolicyId, @SlaTarget = ResolutionMinutes
    FROM core.SlaPolicy
    WHERE IsActive = 1
      AND PriorityId = @PriorityId
      AND (CategoryId = @CategoryId OR CategoryId IS NULL)
    ORDER BY CASE WHEN CategoryId = @CategoryId THEN 0 ELSE 1 END;

    IF @SlaTarget IS NULL
        SELECT @SlaTarget = DefaultResolutionMin FROM lookup.Priority WHERE PriorityId = @PriorityId;

    DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();
    SET @NewIncidentId = NEXT VALUE FOR itil.IncidentSeq;

    BEGIN TRAN;
        INSERT INTO itil.Incident (
            IncidentId, Title, Description,
            PriorityId, StatusId, ImpactId, UrgencyId, CategoryId,
            ServiceId, CiId,
            ReporterUserId, ReporterDisplay, AssigneeUserId, GroupId,
            SlaPolicyId, SlaTargetMinutes, SlaStartedAt,
            OpenedAt, CreatedBy, CreatedAt, UpdatedAt
        ) VALUES (
            @NewIncidentId, @Title, @Description,
            @PriorityId, @StatusId, @ImpactId, @UrgencyId, @CategoryId,
            @ServiceId, @CiId,
            @ReporterUserId, @ReporterDisplay, @AssigneeUserId, @GroupId,
            @SlaPolicyId, @SlaTarget, @Now,
            @Now, @CreatedById, @Now, @Now
        );

        INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, NewValue, OccurredAt)
        VALUES ('INC', @NewIncidentId, @CreatedById, 'created', @Title, @Now);
    COMMIT;
END
GO

CREATE OR ALTER PROCEDURE itil.usp_AssignIncident
    @IncidentId   BIGINT,
    @AssigneeExtId VARCHAR(64),
    @ActorExtId   VARCHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @AssigneeId INT = (SELECT UserId FROM core.[User] WHERE ExternalId = @AssigneeExtId);
    DECLARE @ActorId    INT = (SELECT UserId FROM core.[User] WHERE ExternalId = @ActorExtId);
    DECLARE @OldId      INT = (SELECT AssigneeUserId FROM itil.Incident WHERE IncidentId = @IncidentId);

    BEGIN TRAN;
        UPDATE itil.Incident
        SET AssigneeUserId = @AssigneeId,
            UpdatedAt      = SYSUTCDATETIME()
        WHERE IncidentId = @IncidentId;

        INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, Field, OldValue, NewValue)
        VALUES ('INC', @IncidentId, @ActorId, 'assigned', 'AssigneeUserId',
                CAST(@OldId AS VARCHAR(20)), CAST(@AssigneeId AS VARCHAR(20)));
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

    DECLARE @ActorId INT = (SELECT UserId FROM core.[User] WHERE ExternalId = @ActorExtId);
    DECLARE @OldStatusId TINYINT, @PausesSla BIT, @PausedAt DATETIME2(3);
    DECLARE @WasPaused BIT, @NewPausesSla BIT;

    SELECT @OldStatusId = StatusId, @PausedAt = SlaPausedAt
      FROM itil.Incident WHERE IncidentId = @IncidentId;

    SELECT @WasPaused    = PausesSla FROM lookup.IncidentStatus WHERE StatusId = @OldStatusId;
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
        VALUES ('INC', @IncidentId, @ActorId, 'status_changed', 'StatusId',
                CAST(@OldStatusId AS VARCHAR(8)), CAST(@StatusId AS VARCHAR(8)), @Now);
    COMMIT;
END
GO

CREATE OR ALTER PROCEDURE itil.usp_LinkIncidentToProblem
    @IncidentId BIGINT,
    @ProblemId  BIGINT,
    @ActorExtId VARCHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ActorId INT = (SELECT UserId FROM core.[User] WHERE ExternalId = @ActorExtId);

    BEGIN TRAN;
        UPDATE itil.Incident
        SET ParentProblemId = @ProblemId,
            UpdatedAt       = SYSUTCDATETIME()
        WHERE IncidentId = @IncidentId;

        INSERT INTO itil.IncidentLink (IncidentId, LinkedType, LinkedId, LinkKind, CreatedBy)
        VALUES (@IncidentId, 'PRB', @ProblemId, 'caused_by', @ActorId);

        INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, NewValue)
        VALUES ('INC', @IncidentId, @ActorId, 'linked',
                CONCAT('PRB-', RIGHT('0000' + CAST(@ProblemId AS VARCHAR(20)), 4)));
    COMMIT;
END
GO

CREATE OR ALTER PROCEDURE itil.usp_AddComment
    @ParentType  VARCHAR(8),                 -- 'INC','PRB','CHG'
    @ParentId    BIGINT,
    @AuthorExtId VARCHAR(64),
    @Body        NVARCHAR(MAX),
    @Internal    BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @AuthorId INT = (SELECT UserId FROM core.[User] WHERE ExternalId = @AuthorExtId);

    BEGIN TRAN;
        INSERT INTO audit.Comment (ParentType, ParentId, AuthorUserId, Body, Internal)
        VALUES (@ParentType, @ParentId, @AuthorId, @Body, @Internal);

        INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, NewValue)
        VALUES (@ParentType, @ParentId, @AuthorId, 'commented',
                CONCAT(LEFT(@Body, 80), CASE WHEN LEN(@Body) > 80 THEN '…' ELSE '' END));

        IF @ParentType = 'INC'
            UPDATE itil.Incident   SET UpdatedAt = SYSUTCDATETIME() WHERE IncidentId = @ParentId;
        ELSE IF @ParentType = 'PRB'
            UPDATE itil.Problem    SET UpdatedAt = SYSUTCDATETIME() WHERE ProblemId  = @ParentId;
        ELSE IF @ParentType = 'CHG'
            UPDATE itil.[Change]   SET UpdatedAt = SYSUTCDATETIME() WHERE ChangeId   = @ParentId;
    COMMIT;
END
GO

CREATE OR ALTER PROCEDURE itil.usp_VoteOnChange
    @ChangeId    BIGINT,
    @UserExtId   VARCHAR(64),
    @VoteCode    VARCHAR(16),                -- 'approve','reject'
    @Comment     NVARCHAR(1024) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @UserId INT  = (SELECT UserId FROM core.[User]      WHERE ExternalId = @UserExtId);
    DECLARE @VoteId TINYINT = (SELECT VoteId FROM lookup.ApprovalVote WHERE Code = @VoteCode);
    IF @UserId IS NULL OR @VoteId IS NULL
        THROW 50003, 'Unknown user or vote', 1;

    BEGIN TRAN;
        MERGE itil.ChangeReviewer AS tgt
        USING (SELECT @ChangeId AS ChangeId, @UserId AS UserId) AS src
              ON tgt.ChangeId = src.ChangeId AND tgt.UserId = src.UserId
        WHEN MATCHED THEN
            UPDATE SET VoteId = @VoteId, Comment = @Comment, VotedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
            INSERT (ChangeId, UserId, VoteId, Comment, VotedAt)
            VALUES (@ChangeId, @UserId, @VoteId, @Comment, SYSUTCDATETIME());

        INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, NewValue)
        VALUES ('CHG', @ChangeId, @UserId, CONCAT('vote_', @VoteCode), @Comment);

        UPDATE itil.[Change] SET UpdatedAt = SYSUTCDATETIME() WHERE ChangeId = @ChangeId;
    COMMIT;
END
GO

CREATE OR ALTER PROCEDURE reporting.usp_EvaluateSlaBreaches
AS
/* Run every minute via SQL Agent. Marks SLA warnings (>= 80%) and breaches (>= 100%),
   creates one ActivityEvent + Notification per watcher per state change. */
BEGIN
    SET NOCOUNT ON;
    DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();

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

CREATE OR ALTER PROCEDURE reporting.usp_DashboardKpis
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        (SELECT COUNT(*) FROM itil.Incident i
            JOIN lookup.IncidentStatus s ON s.StatusId = i.StatusId
            WHERE s.IsTerminal = 0 AND i.DeletedAt IS NULL)                                AS OpenIncidents,
        (SELECT COUNT(*) FROM reporting.vSlaBreaching)                                     AS SlaAtRisk,
        (SELECT COUNT(*) FROM itil.[Change] c
            JOIN lookup.ChangeState cs ON cs.StateId = c.StateId
            WHERE cs.Code IN ('scheduled','implementing')
              AND c.ScheduledStart >= DATEADD(DAY, -7, SYSUTCDATETIME()))                  AS ChangesThisWeek,
        (SELECT AVG(CAST(DATEDIFF(MINUTE, OpenedAt, ResolvedAt) AS BIGINT))
         FROM itil.Incident
         WHERE ResolvedAt IS NOT NULL
           AND OpenedAt >= DATEADD(DAY, -7, SYSUTCDATETIME()))                              AS AvgResolutionMinutes;
END
GO

/* ----------------------------------------------------------------------------
   13. TRIGGERS
   ---------------------------------------------------------------------------- */
GO
CREATE OR ALTER TRIGGER itil.trg_Incident_UpdatedAt
ON itil.Incident
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT UPDATE(UpdatedAt)                       -- avoid recursion / loops
    BEGIN
        UPDATE i SET UpdatedAt = SYSUTCDATETIME()
        FROM itil.Incident i
        JOIN inserted ins ON ins.IncidentId = i.IncidentId;
    END
END
GO

CREATE OR ALTER TRIGGER itil.trg_Problem_UpdatedAt
ON itil.Problem
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT UPDATE(UpdatedAt)
    BEGIN
        UPDATE p SET UpdatedAt = SYSUTCDATETIME()
        FROM itil.Problem p
        JOIN inserted ins ON ins.ProblemId = p.ProblemId;
    END
END
GO

CREATE OR ALTER TRIGGER itil.trg_Change_UpdatedAt
ON itil.[Change]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT UPDATE(UpdatedAt)
    BEGIN
        UPDATE c SET UpdatedAt = SYSUTCDATETIME()
        FROM itil.[Change] c
        JOIN inserted ins ON ins.ChangeId = c.ChangeId;
    END
END
GO

/* ----------------------------------------------------------------------------
   14. SEED DATA
   ---------------------------------------------------------------------------- */

-- 14a. lookups
INSERT INTO lookup.Priority (PriorityId, Code, DisplayName, SortOrder, DefaultResponseMin, DefaultResolutionMin) VALUES
    (1,'critical','Critical',1, 15,   60),
    (2,'high',    'High',    2, 30,  240),
    (3,'medium',  'Medium',  3, 60,  480),
    (4,'low',     'Low',     4,120, 2880);

INSERT INTO lookup.IncidentStatus (StatusId, Code, DisplayName, IsTerminal, PausesSla, SortOrder) VALUES
    (1,'new',     'New',         0,0,1),
    (2,'progress','In Progress', 0,0,2),
    (3,'pending', 'Pending',     0,1,3),
    (4,'resolved','Resolved',    1,0,4),
    (5,'closed',  'Closed',      1,0,5);

INSERT INTO lookup.ProblemState (StateId, Code, DisplayName, SortOrder, IsTerminal) VALUES
    (1,'investigating',     'Investigating',         1,0),
    (2,'rca',               'Root cause analysis',   2,0),
    (3,'workaround',        'Workaround applied',    3,0),
    (4,'implementing_fix',  'Implementing fix',      4,0),
    (5,'vendor_engaged',    'Vendor engaged',        5,0),
    (6,'closed',            'Closed',                6,1);

INSERT INTO lookup.ChangeState (StateId, Code, DisplayName, SortOrder, IsTerminal) VALUES
    (1,'draft',           'Draft',            1,0),
    (2,'in_review',       'In Review',        2,0),
    (3,'pending_approval','Pending Approval', 3,0),
    (4,'approved',        'Approved',         4,0),
    (5,'scheduled',       'Scheduled',        5,0),
    (6,'implementing',    'Implementing',     6,0),
    (7,'complete',        'Complete',         7,1),
    (8,'rejected',        'Rejected',         8,1);

INSERT INTO lookup.ChangeType (ChangeTypeId, Code, DisplayName, SortOrder) VALUES
    (1,'normal',    'Normal',    1),
    (2,'standard',  'Standard',  2),
    (3,'emergency', 'Emergency', 3);

INSERT INTO lookup.Risk    (RiskId, Code, DisplayName, SortOrder)    VALUES (1,'low','Low',1),(2,'medium','Medium',2),(3,'high','High',3);
INSERT INTO lookup.Impact  (ImpactId,Code,DisplayName,SortOrder)     VALUES (1,'low','Low',1),(2,'medium','Medium',2),(3,'high','High',3);
INSERT INTO lookup.Urgency (UrgencyId,Code,DisplayName,SortOrder)    VALUES (1,'low','Low',1),(2,'medium','Medium',2),(3,'high','High',3);
INSERT INTO lookup.Role    (RoleId,Code,DisplayName)                 VALUES (1,'requester','Requester'),(2,'agent','Agent'),(3,'manager','Manager'),(4,'admin','Admin');
INSERT INTO lookup.ServiceHealth (HealthId,Code,DisplayName)         VALUES (1,'healthy','Healthy'),(2,'degraded','Degraded'),(3,'incident','Incident');
INSERT INTO lookup.ApprovalVote (VoteId,Code,DisplayName)            VALUES (1,'pending','Pending'),(2,'approve','Approve'),(3,'reject','Reject');

INSERT INTO lookup.Category (Code, DisplayName, SortOrder) VALUES
    ('email',          'Email',           10),
    ('network',        'Network',         20),
    ('saas',           'SaaS',            30),
    ('hardware',       'Hardware',        40),
    ('application',    'Application',     50),
    ('communication',  'Communication',   60),
    ('identity',       'Identity',        70),
    ('infrastructure', 'Infrastructure',  80),
    ('devops',         'DevOps',          90);
GO

-- 14b. groups
INSERT INTO core.[Group] (Slug, Name) VALUES
    ('productivity-apps','Productivity Apps'),
    ('network',          'Network'),
    ('identity',         'Identity'),
    ('field-services',   'Field Services'),
    ('database',         'Database'),
    ('collaboration',    'Collaboration'),
    ('devops',           'DevOps'),
    ('cloud-ops',        'Cloud Ops'),
    ('change-mgmt',      'Change Management');
GO

-- 14c. users (matches the prototype's USERS array)
INSERT INTO core.[User] (ExternalId, Email, DisplayName, Title, AvatarInitials, AvatarColor, RoleId, PrimaryGroupId)
VALUES
    ('u1','mchen@acme.com',   N'Maya Chen',     N'Service Desk Lead',   N'MC','blue',  3,(SELECT GroupId FROM core.[Group] WHERE Slug='productivity-apps')),
    ('u2','dalvarez@acme.com',N'Diego Alvarez', N'Network Engineer',    N'DA','green', 2,(SELECT GroupId FROM core.[Group] WHERE Slug='network')),
    ('u3','praman@acme.com',  N'Priya Raman',   N'L2 Support',          N'PR','purple',2,(SELECT GroupId FROM core.[Group] WHERE Slug='collaboration')),
    ('u4','twalsh@acme.com',  N'Tom Walsh',     N'Sysadmin',            N'TW','amber', 2,(SELECT GroupId FROM core.[Group] WHERE Slug='field-services')),
    ('u5','hvoss@acme.com',   N'Hannah Voss',   N'Security',            N'HV','pink',  2,(SELECT GroupId FROM core.[Group] WHERE Slug='identity')),
    ('u6','ksato@acme.com',   N'Kenji Sato',    N'Cloud Ops',           N'KS','teal',  2,(SELECT GroupId FROM core.[Group] WHERE Slug='cloud-ops')),
    ('u7','opark@acme.com',   N'Olivia Park',   N'Change Manager',      N'OP','blue',  3,(SELECT GroupId FROM core.[Group] WHERE Slug='change-mgmt')),
    ('u8','mwebb@acme.com',   N'Marcus Webb',   N'Database Admin',      N'MW','green', 2,(SELECT GroupId FROM core.[Group] WHERE Slug='database')),
    ('me','acarter@acme.com', N'Alex Carter',   N'Service Desk Agent',  N'AC','blue',  2,(SELECT GroupId FROM core.[Group] WHERE Slug='productivity-apps'));
GO

-- 14d. services
INSERT INTO core.Service (Slug, Name, CategoryId, OwningGroupId, HealthId)
SELECT s.Slug, s.Name, c.CategoryId, g.GroupId, h.HealthId
FROM (VALUES
    ('microsoft-365',   N'Microsoft 365',   'saas',          'productivity-apps','degraded'),
    ('corporate-vpn',   N'Corporate VPN',   'network',       'network',          'degraded'),
    ('salesforce',      N'Salesforce',      'saas',          'collaboration',    'healthy'),
    ('okta',            N'Okta',            'identity',      'identity',         'healthy'),
    ('endpoint',        N'Endpoint',        'hardware',      'field-services',   'healthy'),
    ('sap-erp',         N'SAP ERP',         'application',   'database',         'incident'),
    ('slack',           N'Slack',           'communication', 'collaboration',    'healthy'),
    ('corporate-wifi',  N'Corporate WiFi',  'network',       'network',          'degraded'),
    ('atlassian',       N'Atlassian',       'saas',          'collaboration',    'healthy'),
    ('postgres',        N'Postgres',        'infrastructure','database',         'incident'),
    ('zoom',            N'Zoom',            'communication', 'collaboration',    'healthy'),
    ('github',          N'Github',          'devops',        'devops',           'healthy'),
    ('public-api',      N'Public API',      'application',   'cloud-ops',        'healthy'),
    ('file-storage',    N'File Storage',    'infrastructure','field-services',   'healthy')
) s(Slug, Name, CatCode, GrpSlug, HealthCode)
LEFT JOIN lookup.Category       c ON c.Code = s.CatCode
LEFT JOIN core.[Group]          g ON g.Slug = s.GrpSlug
LEFT JOIN lookup.ServiceHealth  h ON h.Code = s.HealthCode;
GO

-- 14e. configuration items (CIs)
INSERT INTO core.ConfigurationItem (AssetTag, Name, Type, Environment, Region, OwnerUserId)
SELECT v.AssetTag, v.Name, v.Type, v.Env, v.Region, u.UserId
FROM (VALUES
    ('EXCH-NL-01',      N'exch-nl-01.acme.internal',     N'Mail server',  N'Production', N'EU-West',  'u3'),
    ('FW-CORE-NYC',     N'fw-core-nyc.acme.internal',    N'Firewall',     N'Production', N'NA-East',  'u2'),
    ('OKTA-PROD',       N'okta.acme.com',                N'IdP',          N'Production', N'Global',   'u5'),
    ('PRT-HQ-4F-02',    N'printer-hq-4f-02',             N'Printer',      N'Production', N'NA-East',  'u4'),
    ('SAP-PROD-EU',     N'sap-prod-eu',                  N'ERP',          N'Production', N'EU-West',  'u8'),
    ('SLACK-INT',       N'Slack workspace integration',  N'SaaS',         N'Production', N'Global',   'u3'),
    ('WAP-B-3F',        N'wap-b-3f-cluster',             N'WiFi AP',      N'Production', N'NA-East',  'u2'),
    ('ATLAS-CLOUD',     N'acme.atlassian.net',           N'SaaS',         N'Production', N'Global',   'u3'),
    ('ASSET-LT-9921',   N'Asset LT-9921',                N'Laptop',       N'Production', N'NA-East',  'u4'),
    ('ATLAS-JIRA',      N'acme Jira instance',           N'SaaS',         N'Production', N'Global',   'u3'),
    ('PG-PROD-EU-03',   N'pg-prod-eu-03',                N'Database',     N'Production', N'EU-West',  'u8'),
    ('ZOOM-DESK',       N'Zoom desktop client',          N'Endpoint',     N'Production', N'Global',   'u3'),
    ('GHA-RUNNER-01',   N'gha-runner-01',                N'CI runner',    N'Production', N'NA-East',  'u6')
) v(AssetTag, Name, Type, Env, Region, ExtId)
LEFT JOIN core.[User] u ON u.ExternalId = v.ExtId;
GO

-- 14f. SLA policies (defaults, derived from priority)
INSERT INTO core.SlaPolicy (Name, PriorityId, ResponseMinutes, ResolutionMinutes)
SELECT CONCAT('Default — ', p.DisplayName), p.PriorityId, p.DefaultResponseMin, p.DefaultResolutionMin
FROM lookup.Priority p;
GO

-- 14g. helper variables for incident seeding
DECLARE @StatusNew      TINYINT = (SELECT StatusId FROM lookup.IncidentStatus WHERE Code='new');
DECLARE @StatusProgress TINYINT = (SELECT StatusId FROM lookup.IncidentStatus WHERE Code='progress');
DECLARE @StatusPending  TINYINT = (SELECT StatusId FROM lookup.IncidentStatus WHERE Code='pending');
DECLARE @StatusResolved TINYINT = (SELECT StatusId FROM lookup.IncidentStatus WHERE Code='resolved');
DECLARE @ImpactHigh TINYINT = (SELECT ImpactId FROM lookup.Impact WHERE Code='high');
DECLARE @ImpactMed  TINYINT = (SELECT ImpactId FROM lookup.Impact WHERE Code='medium');
DECLARE @ImpactLow  TINYINT = (SELECT ImpactId FROM lookup.Impact WHERE Code='low');
DECLARE @UrgHigh    TINYINT = (SELECT UrgencyId FROM lookup.Urgency WHERE Code='high');
DECLARE @UrgMed     TINYINT = (SELECT UrgencyId FROM lookup.Urgency WHERE Code='medium');
DECLARE @UrgLow     TINYINT = (SELECT UrgencyId FROM lookup.Urgency WHERE Code='low');
DECLARE @Now        DATETIME2(3) = SYSUTCDATETIME();

-- 14h. incidents (mirroring the prototype's INCIDENTS array)
;WITH src(IncId,Title,PriCode,StatusId,AssExt,Reporter,CatCode,SvcSlug,SlaTarget,SlaElapsed,Breached,GrpSlug,Imp,Urg,CiTag,OpenedAgoMin,ResolvedAgoMin) AS (
    SELECT * FROM (VALUES
    (104821,N'Office 365 mailbox sync failing for Sales team (EMEA)',          'critical',@StatusProgress,'u2',N'Pavel Novak', 'email',         'microsoft-365',  60,  53, 0, 'productivity-apps', @ImpactHigh,@UrgHigh,'EXCH-NL-01',     72,  NULL),
    (104820,N'VPN throughput degraded for North America office',                'high',    @StatusProgress,'u2',N'Lin Tao',     'network',       'corporate-vpn',  240,196, 0, 'network',           @ImpactMed, @UrgHigh,'FW-CORE-NYC',   196,  NULL),
    (104819,N'Salesforce SSO login redirect loop on Chrome 124',                'high',    @StatusNew,     NULL,N'Renata Diaz', 'saas',          'salesforce',     240, 18, 0, 'identity',          @ImpactMed, @UrgHigh,'OKTA-PROD',      18,  NULL),
    (104818,N'Printer offline — floor 4 conference room (HQ)',                  'low',     @StatusProgress,'u4',N'Owen Park',   'hardware',      'endpoint',       480, 60, 0, 'field-services',    @ImpactLow, @UrgLow, 'PRT-HQ-4F-02',   65,  NULL),
    (104817,N'ERP weekly batch job failed — closing date 04/30',                'critical',@StatusPending, 'u8',N'Finance Bot', 'application',   'sap-erp',        120,134, 1, 'database',          @ImpactHigh,@UrgHigh,'SAP-PROD-EU',   134,  NULL),
    (104816,N'Slack notifications missing for #alerts-prod channel',            'medium',  @StatusNew,     NULL,N'Jenny Liu',   'communication', 'slack',          360, 42, 0, 'collaboration',     @ImpactLow, @UrgMed, 'SLACK-INT',      42,  NULL),
    (104815,N'Wi-Fi authentication intermittent — Building B floors 2–3',      'high',    @StatusProgress,'u2',N'Kevin Mott',  'network',       'corporate-wifi', 240,188, 0, 'network',           @ImpactMed, @UrgHigh,'WAP-B-3F',      188,  NULL),
    (104814,N'Confluence page rendering blank on Safari 17',                    'low',     @StatusPending, 'u3',N'Eli Brand',   'saas',          'atlassian',      480,240, 0, 'collaboration',     @ImpactLow, @UrgLow, 'ATLAS-CLOUD',   240,  NULL),
    (104813,N'Two-factor SMS not delivered for Verizon numbers',                'medium',  @StatusProgress,'u5',N'Sara Holm',   'identity',      'okta',           240, 99, 0, 'identity',          @ImpactMed, @UrgMed, 'OKTA-PROD',      99,  NULL),
    (104812,N'Macbook battery replacement request — laptop refresh program',    'low',     @StatusPending, 'u4',N'James Wu',    'hardware',      'endpoint',       480,300, 0, 'field-services',    @ImpactLow, @UrgLow, 'ASSET-LT-9921', 300,  NULL),
    (104811,N'Jira automation rule deleting linked epics unexpectedly',         'high',    @StatusProgress,'u3',N'Aria Patel',  'saas',          'atlassian',      240, 71, 0, 'collaboration',     @ImpactMed, @UrgHigh,'ATLAS-JIRA',     79,  NULL),
    (104810,N'Disk usage at 92% on prod-db-eu-03 — paging on call',             'critical',@StatusProgress,'u8',N'Datadog',     'infrastructure','postgres',        60, 24, 0, 'database',          @ImpactHigh,@UrgHigh,'PG-PROD-EU-03',  24,  NULL),
    (104809,N'Zoom client crash on join — multiple Windows users',              'medium',  @StatusNew,     NULL,N'IT Helpdesk', 'communication', 'zoom',           240, 12, 0, 'collaboration',     @ImpactMed, @UrgMed, 'ZOOM-DESK',      12,  NULL),
    (104808,N'Github Actions runner out of disk space',                         'medium',  @StatusResolved,'u6',N'DevOps Bot',  'devops',        'github',         240,162, 0, 'devops',            @ImpactMed, @UrgMed, 'GHA-RUNNER-01', 1440,  60)
    ) AS t(IncId,Title,PriCode,StatusId,AssExt,Reporter,CatCode,SvcSlug,SlaTarget,SlaElapsed,Breached,GrpSlug,Imp,Urg,CiTag,OpenedAgoMin,ResolvedAgoMin)
)
INSERT INTO itil.Incident (
    IncidentId, Title,
    PriorityId, StatusId, ImpactId, UrgencyId, CategoryId,
    ServiceId, CiId,
    ReporterDisplay, AssigneeUserId, GroupId,
    SlaTargetMinutes, SlaStartedAt, SlaBreachedAt,
    OpenedAt, ResolvedAt, CreatedAt, UpdatedAt
)
SELECT
    s.IncId,
    s.Title,
    pr.PriorityId,
    s.StatusId,
    s.Imp,
    s.Urg,
    cat.CategoryId,
    sv.ServiceId,
    ci.CiId,
    s.Reporter,
    u.UserId,
    g.GroupId,
    s.SlaTarget,
    DATEADD(MINUTE, -s.OpenedAgoMin, @Now),
    CASE WHEN s.Breached = 1 THEN DATEADD(MINUTE, -(s.OpenedAgoMin - s.SlaTarget), @Now) END,
    DATEADD(MINUTE, -s.OpenedAgoMin, @Now),
    CASE WHEN s.ResolvedAgoMin IS NOT NULL THEN DATEADD(MINUTE, -s.ResolvedAgoMin, @Now) END,
    @Now, @Now
FROM src s
LEFT JOIN lookup.Priority         pr  ON pr.Code  = s.PriCode
LEFT JOIN lookup.Category         cat ON cat.Code = s.CatCode
LEFT JOIN core.Service            sv  ON sv.Slug  = s.SvcSlug
LEFT JOIN core.ConfigurationItem  ci  ON ci.AssetTag = s.CiTag
LEFT JOIN core.[User]             u   ON u.ExternalId = s.AssExt
LEFT JOIN core.[Group]            g   ON g.Slug   = s.GrpSlug;
GO

-- 14i. problems
DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();
;WITH src(PrbId,Title,PriCode,StateCode,AssExt,Rca,Workaround,IsKnown,GrpSlug,OpenedAgoDays,Resolved) AS (
    SELECT * FROM (VALUES
    (421,N'Recurrent VPN throughput degradation in NA region',         'high',    'rca',              'u2',N'ISP peering saturation during peak hours',N'Yes',0,'network',         9, 0),
    (420,N'Salesforce SSO sporadic redirect loop on Chrome 124',       'high',    'investigating',    'u5',N'Possible Okta cookie SameSite regression',N'Use Edge/Safari',0,'identity',1, 0),
    (419,N'Office 365 mailbox sync issues for EMEA users',             'critical','implementing_fix', 'u3',N'Throttling policy mismatch on EU exchange tenants',N'Yes',1,'productivity-apps',4, 0),
    (418,N'Intermittent 5xx from billing service during checkout',     'medium',  'workaround',       'u6',N'Connection pool exhaustion on cart-svc',N'Yes',1,'cloud-ops',        16, 0),
    (417,N'Slack desktop notifications fail on macOS Sonoma',          'low',     'closed',           'u3',N'macOS Focus mode integration regression — fixed in Slack 4.39',N'—',0,'collaboration', 28, 1),
    (416,N'Wi-Fi roaming drops between APs in Building B',             'medium',  'vendor_engaged',   'u2',N'Cisco AP firmware bug — patch available 5/12',N'Yes',1,'network',     12, 0)
    ) AS t(PrbId,Title,PriCode,StateCode,AssExt,Rca,Workaround,IsKnown,GrpSlug,OpenedAgoDays,Resolved)
)
INSERT INTO itil.Problem (
    ProblemId, Title, RootCause, Workaround,
    PriorityId, StateId, IsKnownError,
    AssigneeUserId, GroupId,
    OpenedAt, ResolvedAt, CreatedAt, UpdatedAt
)
SELECT
    s.PrbId, s.Title, s.Rca, s.Workaround,
    pr.PriorityId, st.StateId, s.IsKnown,
    u.UserId, g.GroupId,
    DATEADD(DAY, -s.OpenedAgoDays, @Now),
    CASE WHEN s.Resolved = 1 THEN DATEADD(DAY, -(s.OpenedAgoDays - 14), @Now) END,
    @Now, @Now
FROM src s
LEFT JOIN lookup.Priority     pr ON pr.Code = s.PriCode
LEFT JOIN lookup.ProblemState st ON st.Code = s.StateCode
LEFT JOIN core.[User]         u  ON u.ExternalId = s.AssExt
LEFT JOIN core.[Group]        g  ON g.Slug = s.GrpSlug;
GO

-- 14j. problem ↔ service links
INSERT INTO itil.ProblemService (ProblemId, ServiceId)
SELECT 421, ServiceId FROM core.Service WHERE Slug='corporate-vpn'
UNION ALL SELECT 420, ServiceId FROM core.Service WHERE Slug IN ('salesforce','okta')
UNION ALL SELECT 419, ServiceId FROM core.Service WHERE Slug='microsoft-365'
UNION ALL SELECT 418, ServiceId FROM core.Service WHERE Slug='public-api'
UNION ALL SELECT 417, ServiceId FROM core.Service WHERE Slug='slack'
UNION ALL SELECT 416, ServiceId FROM core.Service WHERE Slug='corporate-wifi';
GO

-- 14k. link incidents to their parent problems (matches "related": PRB-0419 etc.)
UPDATE itil.Incident SET ParentProblemId = 419 WHERE IncidentId = 104821;
UPDATE itil.Incident SET ParentProblemId = 421 WHERE IncidentId = 104820;
UPDATE itil.Incident SET ParentProblemId = 420 WHERE IncidentId = 104819;
UPDATE itil.Incident SET ParentProblemId = 416 WHERE IncidentId = 104815;
UPDATE itil.Incident SET ParentProblemId = 419 WHERE IncidentId = 104813;
GO

-- 14l. changes
DECLARE @CtNormal TINYINT = (SELECT ChangeTypeId FROM lookup.ChangeType WHERE Code='normal');
DECLARE @CtStd    TINYINT = (SELECT ChangeTypeId FROM lookup.ChangeType WHERE Code='standard');
DECLARE @CtEmer   TINYINT = (SELECT ChangeTypeId FROM lookup.ChangeType WHERE Code='emergency');
DECLARE @RiskHigh TINYINT = (SELECT RiskId FROM lookup.Risk WHERE Code='high');
DECLARE @RiskMed  TINYINT = (SELECT RiskId FROM lookup.Risk WHERE Code='medium');
DECLARE @RiskLow  TINYINT = (SELECT RiskId FROM lookup.Risk WHERE Code='low');
DECLARE @StScheduled  TINYINT = (SELECT StateId FROM lookup.ChangeState WHERE Code='scheduled');
DECLARE @StInReview   TINYINT = (SELECT StateId FROM lookup.ChangeState WHERE Code='in_review');
DECLARE @StPending    TINYINT = (SELECT StateId FROM lookup.ChangeState WHERE Code='pending_approval');
DECLARE @StImplement  TINYINT = (SELECT StateId FROM lookup.ChangeState WHERE Code='implementing');
DECLARE @StRejected   TINYINT = (SELECT StateId FROM lookup.ChangeState WHERE Code='rejected');
DECLARE @StDraft      TINYINT = (SELECT StateId FROM lookup.ChangeState WHERE Code='draft');
DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();

INSERT INTO itil.[Change] (
    ChangeId, Title, ImpactNotes,
    ChangeTypeId, RiskId, StateId,
    OwnerUserId, ApproverUserId, GroupId,
    CabName, ScheduledStart, ScheduledEnd, DowntimeEstimate
)
SELECT v.ChangeId, v.Title, v.Impact,
       v.TypeId, v.RiskId, v.StateId,
       o.UserId, a.UserId, g.GroupId,
       v.Cab, v.SchedStart, v.SchedEnd, v.Downtime
FROM (VALUES
    (3221,N'Quarterly firewall firmware upgrade — DC-NYC1',           N'Production',           @CtNormal,@RiskHigh,@StScheduled, 'u2','u7','network',         'CAB-2026-W18', DATEADD(DAY,3,@Now), DATEADD(HOUR,2, DATEADD(DAY,3,@Now)), N'30 min'),
    (3220,N'Postgres 16 minor version upgrade for prod-db-eu cluster',N'ERP, Data Warehouse', @CtStd,   @RiskMed, @StInReview,  'u8','u7','database',        'CAB-2026-W19', DATEADD(DAY,6,@Now), DATEADD(HOUR,2, DATEADD(DAY,6,@Now)), N'0 (rolling)'),
    (3219,N'Roll out new SSO claims policy to Salesforce production org',N'Salesforce sign-in',@CtNormal,@RiskMed, @StPending,   'u5','u7','identity',        'CAB-2026-W19', DATEADD(DAY,5,@Now), DATEADD(HOUR,1, DATEADD(DAY,5,@Now)), N'0'),
    (3218,N'Scale-out new Kubernetes node pool in eu-west-1',         N'None expected',        @CtStd,   @RiskLow, @StImplement, 'u6','u7','cloud-ops',       'Pre-approved', @Now,                DATEADD(MINUTE,30,@Now),              N'0'),
    (3217,N'Decommission legacy file server FS-NYC-LEGACY-04',        N'Possible link breakage',@CtNormal,@RiskHigh,@StRejected,  'u4','u7','field-services',  'CAB-2026-W19', DATEADD(DAY,8,@Now), DATEADD(HOUR,1, DATEADD(DAY,8,@Now)), N'Indeterminate'),
    (3216,N'Emergency cert rotation for api.acme.com (expiring 5/03)',N'Brief 503s on api.acme.com',@CtEmer,@RiskHigh,@StImplement,'u5','u7','identity',       'ECAB',         @Now,                DATEADD(MINUTE,30,@Now),              N'~2 min'),
    (3215,N'Update VPN client to v7.4.1 enterprise-wide',             N'Single sign-out per user',@CtNormal,@RiskMed,@StDraft,    'u2','u7','network',         'CAB-2026-W20', DATEADD(DAY,11,@Now),DATEADD(HOUR,1, DATEADD(DAY,11,@Now)),N'0')
) v(ChangeId,Title,Impact,TypeId,RiskId,StateId,OwnExt,AppExt,GrpSlug,Cab,SchedStart,SchedEnd,Downtime)
LEFT JOIN core.[User]  o ON o.ExternalId = v.OwnExt
LEFT JOIN core.[User]  a ON a.ExternalId = v.AppExt
LEFT JOIN core.[Group] g ON g.Slug       = v.GrpSlug;
GO

-- change ↔ service links
INSERT INTO itil.ChangeService (ChangeId, ServiceId)
SELECT 3221, ServiceId FROM core.Service WHERE Slug IN ('corporate-vpn')
UNION ALL SELECT 3220, ServiceId FROM core.Service WHERE Slug='sap-erp'
UNION ALL SELECT 3219, ServiceId FROM core.Service WHERE Slug IN ('salesforce','okta')
UNION ALL SELECT 3218, ServiceId FROM core.Service WHERE Slug='public-api'
UNION ALL SELECT 3217, ServiceId FROM core.Service WHERE Slug='file-storage'
UNION ALL SELECT 3216, ServiceId FROM core.Service WHERE Slug='public-api'
UNION ALL SELECT 3215, ServiceId FROM core.Service WHERE Slug='corporate-vpn';
GO

-- change reviewers
DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();
INSERT INTO itil.ChangeReviewer (ChangeId, UserId, VoteId, Comment, VotedAt)
SELECT 3221, u.UserId, v.VoteId, NULL, NULL
FROM core.[User] u
CROSS JOIN lookup.ApprovalVote v
WHERE u.ExternalId IN ('u1','u5','u7') AND v.Code = 'pending';

INSERT INTO itil.ChangeReviewer (ChangeId, UserId, VoteId, VotedAt)
SELECT 3217, u.UserId,
       (SELECT VoteId FROM lookup.ApprovalVote WHERE Code='reject'),
       @Now
FROM core.[User] u WHERE u.ExternalId IN ('u4','u7','u1');
GO

-- 14m. KB categories
INSERT INTO kb.Category (Slug, DisplayName, Icon, SortOrder) VALUES
    ('all',      N'All articles',       'Book',     10),
    ('starred',  N'Starred',            'Star',     20),
    ('drafts',   N'Drafts',             'FileText', 30),
    ('network',  N'Network',            NULL,       40),
    ('endpoint', N'Endpoint & Devices', NULL,       50),
    ('saas',     N'SaaS apps',          NULL,       60),
    ('identity', N'Identity & Access',  NULL,       70),
    ('email',    N'Email & Calendar',   NULL,       80),
    ('security', N'Security',           NULL,       90);
GO

-- KB tags
INSERT INTO kb.Tag (Slug, DisplayName)
VALUES ('vpn',N'VPN'),('setup',N'Setup'),('windows',N'Windows'),('macos',N'macOS'),
       ('password',N'Password'),('mfa',N'MFA'),('okta',N'Okta'),
       ('email',N'Email'),('spam',N'Spam'),('quarantine',N'Quarantine'),
       ('hardware',N'Hardware'),('laptop',N'Laptop'),
       ('salesforce',N'Salesforce'),('provisioning',N'Provisioning'),
       ('wifi',N'WiFi'),('802-1x',N'802.1X'),
       ('calendar',N'Calendar'),('sharing',N'Sharing'),
       ('encryption',N'Encryption'),('compliance',N'Compliance'),
       ('ad',N'AD'),('access',N'Access'),
       ('o365',N'O365'),('known-error',N'Known Error'),('emea',N'EMEA'),
       ('phishing',N'Phishing'),('security',N'Security'),
       ('remote',N'Remote');
GO

-- KB articles
INSERT INTO kb.Article (ArticleId, Title, Snippet, KbCategoryId, AuthorUserId, [Status], Pinned, Views, HelpfulCount)
SELECT v.Id, v.Title, v.Snippet, c.KbCategoryId, u.UserId, 'published', v.Pinned, v.Views,
       CAST(v.HelpfulPct * v.Views / 100.0 AS INT)
FROM (VALUES
    (142,N'Connecting to the corporate VPN on Windows, macOS and mobile',
        N'Step-by-step setup for the GlobalProtect VPN client on all supported platforms, including troubleshooting common authentication errors and split tunneling.',
        'network','u2',12420,94,0),
    (141,N'Resetting your password and enrolling in MFA',
        N'How to reset your Acme account password through the self-service portal, plus how to enroll a new device for multi-factor authentication.',
        'identity','u5',28940,97,0),
    (140,N'Why am I missing emails from external senders?',
        N'If you''re not receiving expected mail from an outside organisation, this article walks through quarantine review and allowlist procedures.',
        'email','u1',8120,89,0),
    (139,N'Requesting a hardware refresh — 3-year laptop cycle',
        N'Eligibility, model options, and the request process for the standard 3-year laptop refresh program. Includes peripheral entitlements.',
        'endpoint','u4',5460,92,0),
    (138,N'Granting Salesforce access to a new contractor',
        N'The approved workflow for managers to provision time-limited Salesforce licenses for contractors, including profile selection and renewal cadence.',
        'saas','u1',3240,91,0),
    (137,N'Wi-Fi authentication: 802.1X cert vs SSO methods',
        N'An overview of the two enterprise Wi-Fi authentication paths supported across our offices, with guidance on which to choose.',
        'network','u2',2010,88,0),
    (136,N'Sharing a calendar with external collaborators',
        N'How to safely share availability or full calendars with people outside Acme without exposing private details. Covers Outlook and Google.',
        'email','u3',4910,95,0),
    (135,N'Encrypting an external drive before storing customer data',
        N'Required encryption procedure for all external storage media that may contain customer or PII data, with FileVault and BitLocker steps.',
        'endpoint','u5',1240,90,0),
    (134,N'Joining a new security group — manager approval flow',
        N'How to request access to additional security groups in Active Directory, what your manager will see, and typical turnaround times.',
        'identity','u1',1820,86,0),
    (133,N'Office 365 mailbox sync issues — known workaround for EMEA',
        N'Active workaround steps for the EMEA mailbox sync delays related to PRB-0419. Will be retired once the throttling policy is corrected.',
        'saas','u3',980,82,1),
    (132,N'Reporting a suspected phishing email',
        N'Use the Report button in Outlook or forward to phishing@acme.com. Do not click links or open attachments. The security team will respond within 1h.',
        'security','u5',6730,96,0),
    (131,N'Working remotely from a hotel or shared Wi-Fi',
        N'Recommended settings and behaviors when joining untrusted networks, including how to verify your VPN tunnel is active before sending sensitive data.',
        'network','u2',3110,93,0)
) v(Id,Title,Snippet,CatSlug,AuthorExt,Views,HelpfulPct,Pinned)
LEFT JOIN kb.Category c ON c.Slug = v.CatSlug
LEFT JOIN core.[User] u ON u.ExternalId = v.AuthorExt;
GO

-- 14n. timeline for the showcased ticket (INC-104821)
DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();
INSERT INTO audit.ActivityEvent (ParentType, ParentId, ActorUserId, Kind, OldValue, NewValue, OccurredAt)
SELECT 'INC',104821, u.UserId, kind, oldv, newv, occ
FROM (VALUES
    ('created',  NULL, N'Created from Self-service Portal', DATEADD(MINUTE,-72,@Now), 'me'),
    ('field_changed', N'medium', N'critical',               DATEADD(MINUTE,-58,@Now), 'u1'),
    ('assigned', NULL, N'Diego Alvarez',                    DATEADD(MINUTE,-55,@Now), 'u1'),
    ('linked',   NULL, N'PRB-0419',                         DATEADD(MINUTE,-47,@Now), 'u2'),
    ('sla_warning', NULL, N'88% elapsed',                   DATEADD(MINUTE,-18,@Now), NULL)
) v(kind,oldv,newv,occ,actor)
LEFT JOIN core.[User] u ON u.ExternalId = v.actor;
GO

INSERT INTO audit.Comment (ParentType, ParentId, AuthorUserId, Body, Internal, CreatedAt)
SELECT 'INC', 104821, u.UserId, body, internal, occ
FROM (VALUES
    (N'Picking this up — confirming scope across the Amsterdam and London offices first.', 0, DATEADD(MINUTE,-64,SYSUTCDATETIME()), 'u1'),
    (N'Replicated. Looks correlated with PRB-0419 (EMEA throttling policy). Same symptom, same tenant. Linking now and applying the documented workaround on the Sales DG.', 1, DATEADD(MINUTE,-47,SYSUTCDATETIME()), 'u2'),
    (N'Workaround pushed to the EMEA Sales distribution group. Confirming with affected users now.', 0, DATEADD(MINUTE,-32,SYSUTCDATETIME()), 'u2'),
    (N'Two of three test users now seeing sub-30s delivery. Third user is on a stale Outlook profile cache — guiding them through a profile rebuild.', 0, DATEADD(MINUTE,-12,SYSUTCDATETIME()), 'u2')
) v(body, internal, occ, ext)
LEFT JOIN core.[User] u ON u.ExternalId = v.ext;
GO

-- 14o. watchers (just enough to hit the prototype's "watchers: N" counts roughly)
INSERT INTO audit.Watcher (ParentType, ParentId, UserId)
SELECT 'INC', 104821, UserId FROM core.[User] WHERE ExternalId IN ('u1','u2','u3','u5','u7','me');
GO

DECLARE @cUsers      INT = (SELECT COUNT(*) FROM core.[User]);
DECLARE @cIncidents  INT = (SELECT COUNT(*) FROM itil.Incident);
DECLARE @cProblems   INT = (SELECT COUNT(*) FROM itil.Problem);
DECLARE @cChanges    INT = (SELECT COUNT(*) FROM itil.[Change]);
DECLARE @cArticles   INT = (SELECT COUNT(*) FROM kb.Article);
DECLARE @cIndexes    INT = (SELECT COUNT(*) FROM sys.indexes
                            WHERE object_id IN (SELECT object_id FROM sys.tables)
                              AND index_id > 0);
DECLARE @cProcs      INT = (SELECT COUNT(*) FROM sys.procedures);
DECLARE @cViews      INT = (SELECT COUNT(*) FROM sys.views WHERE is_ms_shipped = 0);

PRINT '=================================================================';
PRINT ' Aperture ITSM database build complete.';
PRINT '   Database name : ApertureITSM';
PRINT '   Users         : ' + CAST(@cUsers     AS VARCHAR);
PRINT '   Incidents     : ' + CAST(@cIncidents AS VARCHAR);
PRINT '   Problems      : ' + CAST(@cProblems  AS VARCHAR);
PRINT '   Changes       : ' + CAST(@cChanges   AS VARCHAR);
PRINT '   KB articles   : ' + CAST(@cArticles  AS VARCHAR);
PRINT '   Indexes       : ' + CAST(@cIndexes   AS VARCHAR);
PRINT '   Procedures    : ' + CAST(@cProcs     AS VARCHAR);
PRINT '   Views         : ' + CAST(@cViews     AS VARCHAR);
PRINT '=================================================================';
GO
