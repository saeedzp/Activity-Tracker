-- Activities run by calendar month
--
-- The column was called `period`, which invited anything: a quarter, a cycle,
-- a campaign name. Activities are planned per calendar month, so the column
-- says month and nothing else fits.
--
-- Safe to rename: `activities` is empty, and no export column depends on it —
-- the Mars file's 20 columns carry dates, not a period.
alter table activities rename column period to month;

-- Which month's campaign a submission belongs to.
--
-- Without it a submission is locatable only by submitted_at, which files a
-- September stand recorded on 3 October under October. The month is resolved
-- from the planned activity where one matches, so a late entry lands in the
-- month it was actually for.
alter table submissions add column if not exists month text;

comment on column submissions.month is
  'YYYY-MM of the campaign this belongs to. Taken from the matched activity, else the submission month.';

create index if not exists submissions_month_idx on submissions (month, store_id);
create index if not exists activities_month_idx on activities (month);

-- Finding the planned line for a store, brand and display type within a month
-- is the lookup every submission now performs, so it gets its own index.
create index if not exists activities_plan_lookup_idx
  on activities (month, planned_store_id, brand, display_type);

-- Rows written before the column existed carry no month, so they fall out of
-- every monthly view. The submission date is the only evidence available for
-- them; new rows resolve their month from the plan instead.
update submissions
set month = to_char(submitted_at at time zone 'UTC', 'YYYY-MM')
where month is null;
