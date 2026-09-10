-- The planogram: what the stand is supposed to look like
--
-- A campaign arrives with a drawing — the stand, its shelves, and which SKU
-- goes where. The employee needs it in front of them while they build the
-- stand, and it has to still be findable months later, because "what did the
-- 2x2 look like in September" is a question that gets asked long after
-- September.
--
-- Attached to the campaign and, optionally, to one size: a campaign that ships
-- a 2x2 and a gondola has a different drawing for each, while a campaign with
-- one drawing for everything leaves display_type null and it shows for every
-- size.
create table if not exists planograms (
  id           uuid primary key default gen_random_uuid(),
  activity_id  uuid not null references activities (id) on delete cascade,
  -- Copied from the campaign, like everything else that is filed by month, so
  -- the archive is one indexed lookup rather than a join.
  month        text not null,
  display_type text check (display_type in (
                 '50X50', '1x1', '2x1', '2x2', '3x2', '6x2', 'GE', 'GMU', 'Rebrandable'
               )),
  title        text,
  r2_key       text not null,
  bytes        integer,
  created_at   timestamptz not null default now()
);

create index if not exists planograms_month_idx on planograms (month, activity_id);
create index if not exists planograms_activity_idx on planograms (activity_id, display_type);

alter table planograms enable row level security;
revoke all on planograms from anon, authenticated;
