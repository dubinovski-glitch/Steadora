/* ============================================================================
   Alter_20260628_AddTaskFields.sql
   Adds ServiceNow-style fields to itil.Task:
     • Subtype       — per-type category (incident: activity type, problem: task
                       type, change: task type). NULL for general tasks.
     • PlannedStart / PlannedEnd — scheduled window (mainly change tasks).
     • OnHoldReason  — populated when StatusCode = 'onhold'.
     • StatusCode now also allows 'onhold'.
   Additive and idempotent — safe to re-run, no changes to existing data.
   ============================================================================ */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('itil.Task', 'Subtype')      IS NULL  ALTER TABLE itil.Task ADD Subtype      VARCHAR(32)   NULL;
GO
IF COL_LENGTH('itil.Task', 'PlannedStart') IS NULL  ALTER TABLE itil.Task ADD PlannedStart DATE          NULL;
GO
IF COL_LENGTH('itil.Task', 'PlannedEnd')   IS NULL  ALTER TABLE itil.Task ADD PlannedEnd   DATE          NULL;
GO
IF COL_LENGTH('itil.Task', 'OnHoldReason') IS NULL  ALTER TABLE itil.Task ADD OnHoldReason NVARCHAR(256) NULL;
GO

-- Allow the 'onhold' state
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Task_Status' AND parent_object_id = OBJECT_ID('itil.Task'))
    ALTER TABLE itil.Task DROP CONSTRAINT CK_Task_Status;
ALTER TABLE itil.Task ADD CONSTRAINT CK_Task_Status CHECK (StatusCode IN ('open', 'progress', 'onhold', 'done'));
GO

PRINT 'Alter_20260628_AddTaskFields applied successfully.';
GO
