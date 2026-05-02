-- Add Description column to lookup.Role and set default descriptions per role.
-- Date: 2026-05-02

ALTER TABLE lookup.Role ADD Description NVARCHAR(256) NULL;

UPDATE lookup.Role SET DisplayName = 'Administrator',    Description = 'Full access, including configuration.'     WHERE Code = 'admin';
UPDATE lookup.Role SET DisplayName = 'Service Manager',  Description = 'Manage tickets, teams, and approvals.'     WHERE Code = 'manager';
UPDATE lookup.Role SET DisplayName = 'Agent',            Description = 'Triage and resolve tickets.'               WHERE Code = 'agent';
UPDATE lookup.Role SET DisplayName = 'Requester',        Description = 'Submit and track own tickets.'             WHERE Code = 'requester';
