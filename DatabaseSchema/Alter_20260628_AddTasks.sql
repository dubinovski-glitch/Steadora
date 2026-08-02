/* ============================================================================
   Alter_20260628_AddTasks.sql
   Adds the Tasks capability:
     • itil.TaskCounter — per-type counter for gap-free, race-safe identifiers
     • itil.Task        — task records with a persisted, type-prefixed Number
                          (INCTASK-/PRBTASK-/CHGTASK-/GENTASK- + 8-digit seq)
   Idempotent and safe to re-run.
   ============================================================================ */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Per-type counter. The create path does an UPDATE … SET LastSeq = LastSeq + 1
-- inside the insert transaction, which takes a row lock → race-safe and gap-free.
IF OBJECT_ID('itil.TaskCounter', 'U') IS NULL
BEGIN
    CREATE TABLE itil.TaskCounter (
        TaskType VARCHAR(16) NOT NULL CONSTRAINT PK_TaskCounter PRIMARY KEY,
        LastSeq  INT          NOT NULL CONSTRAINT DF_TaskCounter_LastSeq DEFAULT 0
    );
    INSERT INTO itil.TaskCounter (TaskType, LastSeq)
    VALUES ('incident', 0), ('problem', 0), ('change', 0), ('general', 0);
END
GO

IF OBJECT_ID('itil.Task', 'U') IS NULL
BEGIN
    CREATE TABLE itil.Task (
        TaskId          BIGINT        IDENTITY(1,1) NOT NULL CONSTRAINT PK_Task PRIMARY KEY,
        TaskType        VARCHAR(16)   NOT NULL,
        Seq             INT           NOT NULL,
        -- Human-readable identifier, generated from type + per-type sequence
        Number          AS (CASE TaskType
                              WHEN 'incident' THEN 'INCTASK-'
                              WHEN 'problem'  THEN 'PRBTASK-'
                              WHEN 'change'   THEN 'CHGTASK-'
                              ELSE 'GENTASK-' END
                            + RIGHT('00000000' + CAST(Seq AS VARCHAR(8)), 8)) PERSISTED,
        Title           NVARCHAR(256) NOT NULL,
        ReferenceNumber VARCHAR(32)   NULL,        -- linked record (INC-/PRB-/CHG-); NULL for general
        PriorityId      TINYINT       NOT NULL,
        StatusCode      VARCHAR(16)   NOT NULL CONSTRAINT DF_Task_Status DEFAULT 'open',  -- open|progress|done
        DueDate         DATE          NULL,
        AssigneeUserId  INT           NULL,
        GroupId         INT           NULL,
        Description     NVARCHAR(MAX) NULL,
        WorkspaceId     INT           NOT NULL CONSTRAINT DF_Task_WS DEFAULT 1,
        CreatedAt       DATETIME2(3)  NOT NULL CONSTRAINT DF_Task_Created DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2(3)  NOT NULL CONSTRAINT DF_Task_Updated DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Task_TypeSeq   UNIQUE (TaskType, Seq),
        CONSTRAINT CK_Task_Type      CHECK (TaskType IN ('incident', 'problem', 'change', 'general')),
        CONSTRAINT CK_Task_Status    CHECK (StatusCode IN ('open', 'progress', 'done')),
        CONSTRAINT FK_Task_Priority  FOREIGN KEY (PriorityId)     REFERENCES lookup.Priority(PriorityId),
        CONSTRAINT FK_Task_Assignee  FOREIGN KEY (AssigneeUserId) REFERENCES core.[User](UserId),
        CONSTRAINT FK_Task_Group     FOREIGN KEY (GroupId)        REFERENCES core.[Group](GroupId),
        CONSTRAINT FK_Task_Workspace FOREIGN KEY (WorkspaceId)    REFERENCES core.Workspace(WorkspaceId)
    );
    CREATE INDEX IX_Task_Type_Workspace ON itil.Task (TaskType, WorkspaceId);
    CREATE INDEX IX_Task_Assignee       ON itil.Task (AssigneeUserId);
    CREATE INDEX IX_Task_Group          ON itil.Task (GroupId);
END
GO

PRINT 'Alter_20260628_AddTasks applied successfully.';
GO
