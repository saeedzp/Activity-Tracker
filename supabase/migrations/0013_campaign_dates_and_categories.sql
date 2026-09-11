-- The last three columns Mars asks for that we were exporting empty
--
-- Effective From/To are the campaign's own dates. Optional, because Mars does
-- not always send them, and a required field that is often unknowable just
-- teaches people to type something false.
--
-- Category is per brand, not per campaign: their file carries one line per
-- brand with its own category, and a campaign can mix chocolate with gum.
-- Stored as an object keyed by brand rather than a parallel array, so it
-- cannot silently fall out of step with the brands beside it.
alter table activities add column if not exists effective_from date;
alter table activities add column if not exists effective_to   date;
alter table activities add column if not exists brand_categories jsonb not null default '{}'::jsonb;

-- Copied onto the submission like the rest of the campaign: renaming or
-- recategorising a campaign months later must not rewrite what was already
-- reported and exported.
alter table submissions add column if not exists effective_from date;
alter table submissions add column if not exists effective_to   date;
alter table submissions add column if not exists brand_categories jsonb not null default '{}'::jsonb;
