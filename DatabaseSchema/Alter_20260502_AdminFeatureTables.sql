/* ============================================================================
   Aperture ITSM — Alter script
   Date:    2026-05-02
   Change:  Add admin schema with SLA tiers, business calendars, automations,
            priority matrix table, and SlaTierId column on core.Service.
   ============================================================================ */

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ----------------------------------------------------------------------------
   1. NEW SCHEMA
   ---------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'admin')
BEGIN
    EXEC('CREATE SCHEMA [admin] AUTHORIZATION dbo;');
END
GO

/* ----------------------------------------------------------------------------
   2. NEW TABLES
   ---------------------------------------------------------------------------- */

-- SLA Tiers
CREATE TABLE admin.SlaTier (
    SlaTierId    INT           NOT NULL IDENTITY(1,1) PRIMARY KEY,
    Name         NVARCHAR(64)  NOT NULL UNIQUE,
    Description  NVARCHAR(256) NULL,
    IsActive     BIT           NOT NULL DEFAULT 1,
    Calculate247 BIT           NOT NULL DEFAULT 1,
    AutoEscalate BIT           NOT NULL DEFAULT 1,
    SortOrder    INT           NOT NULL DEFAULT 100
);
GO

-- SLA Tier Targets (per priority)
CREATE TABLE admin.SlaTierTarget (
    TargetId          INT     NOT NULL IDENTITY(1,1) PRIMARY KEY,
    SlaTierId         INT     NOT NULL REFERENCES admin.SlaTier(SlaTierId),
    PriorityId        TINYINT NOT NULL REFERENCES lookup.Priority(PriorityId),
    ResponseMinutes   INT     NOT NULL,
    ResolutionMinutes INT     NOT NULL,
    UNIQUE (SlaTierId, PriorityId)
);
GO

-- Business Calendars
CREATE TABLE admin.BusinessCalendar (
    CalendarId INT           NOT NULL IDENTITY(1,1) PRIMARY KEY,
    Name       NVARCHAR(128) NOT NULL,
    Timezone   NVARCHAR(64)  NOT NULL DEFAULT 'UTC',
    IsDefault  BIT           NOT NULL DEFAULT 0,
    CreatedAt  DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Business Days per calendar
CREATE TABLE admin.BusinessDay (
    DayId      INT     NOT NULL IDENTITY(1,1) PRIMARY KEY,
    CalendarId INT     NOT NULL REFERENCES admin.BusinessCalendar(CalendarId),
    DayOfWeek  TINYINT NOT NULL,   -- 1=Mon ... 7=Sun
    StartTime  TIME    NULL,
    EndTime    TIME    NULL,
    UNIQUE (CalendarId, DayOfWeek)
);
GO

-- Business Holidays per calendar
CREATE TABLE admin.BusinessHoliday (
    HolidayId   INT           NOT NULL IDENTITY(1,1) PRIMARY KEY,
    CalendarId  INT           NOT NULL REFERENCES admin.BusinessCalendar(CalendarId),
    HolidayDate DATE          NOT NULL,
    Name        NVARCHAR(128) NOT NULL
);
GO

-- Automations
CREATE TABLE admin.Automation (
    AutomationId    INT           NOT NULL IDENTITY(1,1) PRIMARY KEY,
    Name            NVARCHAR(128) NOT NULL,
    WhenDescription NVARCHAR(512) NOT NULL,
    ThenDescription NVARCHAR(512) NOT NULL,
    IsEnabled       BIT           NOT NULL DEFAULT 1,
    RunCount30d     INT           NOT NULL DEFAULT 0,
    CreatedAt       DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- Priority Matrix
CREATE TABLE lookup.PriorityMatrix (
    ImpactId   TINYINT NOT NULL REFERENCES lookup.Impact(ImpactId),
    UrgencyId  TINYINT NOT NULL REFERENCES lookup.Urgency(UrgencyId),
    PriorityId TINYINT NOT NULL REFERENCES lookup.Priority(PriorityId),
    PRIMARY KEY (ImpactId, UrgencyId)
);
GO

/* ----------------------------------------------------------------------------
   3. ALTER EXISTING TABLES
   ---------------------------------------------------------------------------- */
ALTER TABLE core.Service ADD SlaTierId INT NULL REFERENCES admin.SlaTier(SlaTierId);
GO

/* ----------------------------------------------------------------------------
   4. SEED DATA
   ---------------------------------------------------------------------------- */

-- SLA Tiers
INSERT INTO admin.SlaTier (Name, Description, IsActive, Calculate247, AutoEscalate, SortOrder)
VALUES
    (N'Platinum', N'Critical services — tightest response and resolution targets, 24×7 coverage.', 1, 1, 1, 10),
    (N'Gold',     N'Tier-1 SaaS platforms — fast response with 24×7 monitoring.',                  1, 1, 1, 20),
    (N'Silver',   N'Standard business services — business-hours SLA windows.',                      1, 0, 1, 30),
    (N'Bronze',   N'Internal tooling — relaxed targets, inactive tier.',                            0, 0, 0, 40);
GO

-- SLA Tier Targets
-- Platinum
INSERT INTO admin.SlaTierTarget (SlaTierId, PriorityId, ResponseMinutes, ResolutionMinutes)
SELECT t.SlaTierId, p.PriorityId, v.Resp, v.Resol
FROM (VALUES
    (N'critical',  15,   60),
    (N'high',      30,  240),
    (N'medium',    60,  480),
    (N'low',      120, 2880)
) v(Code, Resp, Resol)
JOIN lookup.Priority    p ON p.Code = v.Code
JOIN admin.SlaTier      t ON t.Name = N'Platinum';
GO

-- Gold
INSERT INTO admin.SlaTierTarget (SlaTierId, PriorityId, ResponseMinutes, ResolutionMinutes)
SELECT t.SlaTierId, p.PriorityId, v.Resp, v.Resol
FROM (VALUES
    (N'critical',   30,  120),
    (N'high',       60,  480),
    (N'medium',    120,  960),
    (N'low',       240, 5760)
) v(Code, Resp, Resol)
JOIN lookup.Priority p ON p.Code = v.Code
JOIN admin.SlaTier   t ON t.Name = N'Gold';
GO

-- Silver
INSERT INTO admin.SlaTierTarget (SlaTierId, PriorityId, ResponseMinutes, ResolutionMinutes)
SELECT t.SlaTierId, p.PriorityId, v.Resp, v.Resol
FROM (VALUES
    (N'critical',   60,   240),
    (N'high',      120,   960),
    (N'medium',    240,  1920),
    (N'low',       480, 11520)
) v(Code, Resp, Resol)
JOIN lookup.Priority p ON p.Code = v.Code
JOIN admin.SlaTier   t ON t.Name = N'Silver';
GO

-- Bronze
INSERT INTO admin.SlaTierTarget (SlaTierId, PriorityId, ResponseMinutes, ResolutionMinutes)
SELECT t.SlaTierId, p.PriorityId, v.Resp, v.Resol
FROM (VALUES
    (N'critical',  240,   480),
    (N'high',      480,  1920),
    (N'medium',    960,  3840),
    (N'low',      1920,  7680)
) v(Code, Resp, Resol)
JOIN lookup.Priority p ON p.Code = v.Code
JOIN admin.SlaTier   t ON t.Name = N'Bronze';
GO

-- Business Calendar
INSERT INTO admin.BusinessCalendar (Name, Timezone, IsDefault)
VALUES (N'Default — Europe (Prague)', N'Europe/Prague', 1);
GO

-- Business Days (1=Mon … 7=Sun)
DECLARE @CalId INT = (SELECT CalendarId FROM admin.BusinessCalendar WHERE IsDefault = 1);
INSERT INTO admin.BusinessDay (CalendarId, DayOfWeek, StartTime, EndTime)
VALUES
    (@CalId, 1, '08:00', '18:00'),  -- Monday
    (@CalId, 2, '08:00', '18:00'),  -- Tuesday
    (@CalId, 3, '08:00', '18:00'),  -- Wednesday
    (@CalId, 4, '08:00', '18:00'),  -- Thursday
    (@CalId, 5, '08:00', '18:00'),  -- Friday
    (@CalId, 6, NULL,    NULL),      -- Saturday (closed)
    (@CalId, 7, NULL,    NULL);      -- Sunday (closed)
GO

-- Business Holidays (Czech public holidays 2026)
DECLARE @CalId2 INT = (SELECT CalendarId FROM admin.BusinessCalendar WHERE IsDefault = 1);
INSERT INTO admin.BusinessHoliday (CalendarId, HolidayDate, Name)
VALUES
    (@CalId2, '2026-01-01', N'New Year''s Day'),
    (@CalId2, '2026-05-01', N'Labour Day'),
    (@CalId2, '2026-05-08', N'Liberation Day'),
    (@CalId2, '2026-07-05', N'Cyril & Methodius Day'),
    (@CalId2, '2026-07-06', N'Jan Hus Day'),
    (@CalId2, '2026-09-28', N'St Wenceslas Day'),
    (@CalId2, '2026-10-28', N'Independence Day'),
    (@CalId2, '2026-11-17', N'Freedom & Democracy Day');
GO

-- Priority Matrix (ImpactId 1=low, 2=med, 3=high; UrgencyId 1=low, 2=med, 3=high)
-- Resulting priority: low×low=low, low×med=low, low×high=med,
--                     med×low=low, med×med=med, med×high=high,
--                     high×low=med, high×med=high, high×high=critical
INSERT INTO lookup.PriorityMatrix (ImpactId, UrgencyId, PriorityId)
SELECT v.ImpId, v.UrgId, p.PriorityId
FROM (VALUES
    (1, 1, N'low'),
    (1, 2, N'low'),
    (1, 3, N'medium'),
    (2, 1, N'low'),
    (2, 2, N'medium'),
    (2, 3, N'high'),
    (3, 1, N'medium'),
    (3, 2, N'high'),
    (3, 3, N'critical')
) v(ImpId, UrgId, PCode)
JOIN lookup.Priority p ON p.Code = v.PCode;
GO

-- Automations (seed data)
INSERT INTO admin.Automation (Name, WhenDescription, ThenDescription, IsEnabled, RunCount30d)
VALUES
    (N'Auto-assign critical incidents',
     N'a new incident is created with Priority = Critical',
     N'assign to On-Call group and set SLA timer',
     1, 142),
    (N'SLA warning notification',
     N'an incident SLA reaches 80% elapsed',
     N'notify assignee and group manager via email',
     1, 389),
    (N'Stale incident reminder',
     N'an incident has had no update for 3 business days',
     N'send reminder to assignee and add internal note',
     1, 57),
    (N'Auto-close resolved incidents',
     N'an incident has been in Resolved state for 5 days with no response',
     N'move to Closed and notify reporter',
     0, 0);
GO
