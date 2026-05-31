-- Remove SortOrder from Category and SubCategory; ordering is now alphabetical by DisplayName.
ALTER TABLE lookup.Category    DROP COLUMN SortOrder;
ALTER TABLE lookup.SubCategory DROP COLUMN SortOrder;
