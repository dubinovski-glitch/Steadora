-- Add lookup.SubCategory table to support subcategory management in Administration.
-- Date: 2026-05-02

CREATE TABLE lookup.SubCategory (
    SubCategoryId   INT          NOT NULL IDENTITY(1,1) PRIMARY KEY,
    CategoryId      INT          NOT NULL REFERENCES lookup.Category(CategoryId),
    Code            VARCHAR(32)  NOT NULL UNIQUE,
    DisplayName     NVARCHAR(64) NOT NULL,
    SortOrder       INT          NOT NULL DEFAULT 100
);

CREATE INDEX IX_SubCategory_CategoryId ON lookup.SubCategory (CategoryId);
