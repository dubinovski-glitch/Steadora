-- Remove the Priority Matrix feature entirely.
-- The table was only used by the admin Priority Matrix config screen, which has
-- been removed. Incident priority is set directly, not derived from impact×urgency.
DROP TABLE IF EXISTS lookup.PriorityMatrix;
