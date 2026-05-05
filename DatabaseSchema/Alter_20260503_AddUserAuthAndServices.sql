/* ----------------------------------------------------------------------------
   Alter_20260503_AddUserAuthAndServices.sql
   1. Adds Username and PasswordHash columns to core.[User].
   2. Creates core.UserService junction table (user ↔ service, many-to-many).
   Date: 2026-05-03
   Safe to re-run: each step checks whether the object already exists.
   ---------------------------------------------------------------------------- */

-- 1a. Add Username column if it does not exist yet
IF COL_LENGTH('core.[User]', 'Username') IS NULL
BEGIN
    ALTER TABLE core.[User]
        ADD Username NVARCHAR(128) NOT NULL DEFAULT '';
END
GO

-- 1b. Backfill unique usernames from ExternalId for any rows still blank
UPDATE core.[User]
SET    Username = ExternalId
WHERE  Username = '';
GO

-- 1c. Now safe to add the unique constraint (all values are distinct)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE  object_id = OBJECT_ID('core.[User]') AND name = 'UQ_User_Username'
)
BEGIN
    ALTER TABLE core.[User]
        ADD CONSTRAINT UQ_User_Username UNIQUE (Username);
END
GO

-- 2. Add PasswordHash column if it does not exist yet
IF COL_LENGTH('core.[User]', 'PasswordHash') IS NULL
BEGIN
    ALTER TABLE core.[User]
        ADD PasswordHash NVARCHAR(512) NULL;
END
GO

-- 3. Create user-service junction table if it does not exist yet
IF OBJECT_ID('core.UserService', 'U') IS NULL
BEGIN
    CREATE TABLE core.UserService (
        UserServiceId   INT  NOT NULL IDENTITY(1,1) PRIMARY KEY,
        UserId          INT  NOT NULL,
        ServiceId       INT  NOT NULL,
        CONSTRAINT UQ_UserService            UNIQUE (UserId, ServiceId),
        CONSTRAINT FK_UserService_User       FOREIGN KEY (UserId)    REFERENCES core.[User]  (UserId),
        CONSTRAINT FK_UserService_Service    FOREIGN KEY (ServiceId) REFERENCES core.Service (ServiceId)
    );
    CREATE INDEX IX_UserService_UserId    ON core.UserService (UserId);
    CREATE INDEX IX_UserService_ServiceId ON core.UserService (ServiceId);
END
GO
