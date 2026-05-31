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
