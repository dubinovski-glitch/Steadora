/* ----------------------------------------------------------------------------
   Alter_20260803_RemoveKnowledgeBase.sql
   Removes the Knowledge Base feature entirely: the kb schema and all its
   objects, plus the KB-related columns on itil.Incident.
   Safe to re-run (every step is guarded with IF EXISTS).
   Date: 2026-08-03
   ---------------------------------------------------------------------------- */

-- 1. Drop the incident → article FK, then the KB columns on itil.Incident
IF OBJECT_ID('itil.FK_Inc_RelatedKbArticle', 'F') IS NOT NULL
    ALTER TABLE itil.Incident DROP CONSTRAINT FK_Inc_RelatedKbArticle;
GO

-- IsKbArticleCreated has an unnamed DEFAULT constraint; find and drop it first.
DECLARE @df SYSNAME =
    (SELECT dc.name
     FROM sys.default_constraints dc
     JOIN sys.columns c ON c.object_id = dc.parent_object_id
                       AND c.column_id = dc.parent_column_id
     WHERE dc.parent_object_id = OBJECT_ID('itil.Incident')
       AND c.name = 'IsKbArticleCreated');
IF @df IS NOT NULL
    EXEC ('ALTER TABLE itil.Incident DROP CONSTRAINT [' + @df + ']');
GO

IF COL_LENGTH('itil.Incident', 'RelatedKbArticleId') IS NOT NULL
    ALTER TABLE itil.Incident DROP COLUMN RelatedKbArticleId;
IF COL_LENGTH('itil.Incident', 'IsKbArticleCreated') IS NOT NULL
    ALTER TABLE itil.Incident DROP COLUMN IsKbArticleCreated;
GO

-- 2. Drop the kb tables (children first), sequence, and schema
IF OBJECT_ID('kb.ArticleTag', 'U') IS NOT NULL DROP TABLE kb.ArticleTag;
IF OBJECT_ID('kb.Tag',        'U') IS NOT NULL DROP TABLE kb.Tag;
IF OBJECT_ID('kb.Article',    'U') IS NOT NULL DROP TABLE kb.Article;
IF OBJECT_ID('kb.Category',   'U') IS NOT NULL DROP TABLE kb.Category;
GO

IF OBJECT_ID('kb.ArticleSeq', 'SO') IS NOT NULL DROP SEQUENCE kb.ArticleSeq;
GO

IF SCHEMA_ID('kb') IS NOT NULL
    EXEC ('DROP SCHEMA kb');
GO
