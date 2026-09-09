-- An activity is a campaign, not a size
--
-- "العودة للمدارس" carrying Twix and Snickers is one activity; the 2x2 it
-- arrives on is a separate fact. Brands belong to the campaign and there can be
-- several of them, so a single brand column could never hold it.
alter table activities add column if not exists name text;
alter table activities add column if not exists brands text[] not null default '{}';
alter table activities add column if not exists active boolean not null default true;
alter table activities add column if not exists sort_order integer not null default 100;

-- The Mars-import fields stay for a per-store plan later, but an activity
-- entered by hand has neither.
alter table activities alter column brand drop not null;
alter table activities alter column display_type drop not null;

create index if not exists activities_month_active_idx
  on activities (month, active, sort_order);

-- The submission snapshots the campaign it answered.
--
-- Copied rather than joined: editing a campaign months later must not rewrite
-- what an employee reported at the time.
alter table submissions add column if not exists activity_name text;
alter table submissions add column if not exists brands text[] not null default '{}';
alter table submissions alter column brand drop not null;

-- Brands are a property of the campaign now, so the standalone list has no
-- owner and nothing reads it.
drop table if exists brands;
