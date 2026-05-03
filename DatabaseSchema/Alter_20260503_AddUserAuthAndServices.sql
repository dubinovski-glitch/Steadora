/* ----------------------------------------------------------------------------
   Alter_20260503_AddUserAuthAndServices.sql
   1. Adds Username and PasswordHash columns to core.[User].
   2. Creates core.UserService junction table (user ↔ service, many-to-many).
   Date: 2026-05-03
   ---------------------------------------------------------------------------- */

-- 1. Add Username column (unique login name)
ALTER TABLE core.[User]
    ADD Username NVARCHAR(128) NOT NULL DEFAULT '';
GO

ALTER TABLE core.[User]
    ADD CONSTRAINT UQ_User_Username UNIQUE (Username);
GO

-- 2. Add PasswordHash column (PBKDF2-SHA256, base64 salt:hash; nullable = not yet set)
ALTER TABLE core.[User]
    ADD PasswordHash NVARCHAR(512) NULL;
GO

-- 3. Create user–service junction table
CREATE TABLE core.UserService (
    UserServiceId   INT  NOT NULL IDENTITY(1,1) PRIMARY KEY,
    UserId          INT  NOT NULL,
    ServiceId       INT  NOT NULL,
    CONSTRAINT UQ_UserService   UNIQUE (UserId, ServiceId),
    CONSTRAINT FK_UserService_User    FOREIGN KEY (UserId)    REFERENCES core.[User]   (UserId),
    CONSTRAINT FK_UserService_Service FOREIGN KEY (ServiceId) REFERENCES core.Service  (ServiceId)
);
GO

CREATE INDEX IX_UserService_UserId    ON core.UserService (UserId);
CREATE INDEX IX_UserService_ServiceId ON core.UserService (ServiceId);
GO
