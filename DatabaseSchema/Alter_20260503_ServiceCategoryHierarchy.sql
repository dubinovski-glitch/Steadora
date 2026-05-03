/* ============================================================================
   Alter_20260503_ServiceCategoryHierarchy.sql
   Change: Reverse Category↔Service relationship.
   Before: core.Service.CategoryId → lookup.Category
   After:  lookup.Category.ServiceId → core.Service  (Service → Category → SubCategory)
   Date:   2026-05-03
   ============================================================================ */
USE ApertureITSM;
GO

-- 1. Add ServiceId to lookup.Category (nullable so existing rows don't break)
ALTER TABLE lookup.Category ADD ServiceId INT NULL;
GO

-- 2. FK: Category.ServiceId → core.Service
ALTER TABLE lookup.Category
    ADD CONSTRAINT FK_Category_Service
        FOREIGN KEY (ServiceId) REFERENCES core.Service(ServiceId);
GO

-- 3. Drop old FK from core.Service to lookup.Category
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Service_Category' AND parent_object_id = OBJECT_ID('core.Service'))
    ALTER TABLE core.Service DROP CONSTRAINT FK_Service_Category;
GO

-- 4. Drop CategoryId column from core.Service
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('core.Service') AND name = 'CategoryId')
    ALTER TABLE core.Service DROP COLUMN CategoryId;
GO
