-- Activity Tracker — initial schema.
-- Storage is English-only; Arabic lives in the UI layer.

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------- stores
create table if not exists stores (
  id           text primary key,
  name         text not null,
  account      text not null,
  city         text,
  region       text,
  -- Mars' own store number: what activity files are matched on.
  mars_code    text,
  -- The retailer's internal number; frequently 0 or free text, so not trusted.
  retailer_no  text,
  me_id        text,
  me_name      text,
  tl_id        text,
  tl_name      text
);

create index if not exists stores_account_idx on stores (account);
create index if not exists stores_mars_code_idx on stores (account, mars_code);
create index if not exists stores_me_idx      on stores (me_id);
create index if not exists stores_tl_idx      on stores (tl_id);

-- -------------------------------------------------------------------- users
create table if not exists users (
  emp_id text primary key,
  name   text not null,
  role   text not null check (role in ('me', 'tl')),
  active boolean not null default true
);

-- --------------------------------------------------------------- activities
create table if not exists activities (
  id               uuid primary key default gen_random_uuid(),
  period           text,
  brand            text not null,
  display_type     text not null,
  promo_desc       text,
  effective_from   date,
  effective_to     date,
  planned_store_id text references stores (id),
  account          text,
  region           text,
  city             text,
  -- Kept verbatim as it arrived in the Mars file, never overwritten.
  mars_store_no    text,
  mars_store_name  text,
  match_method     text not null default 'unlinked'
                   check (match_method in ('exact', 'fuzzy', 'manual', 'unlinked')),
  match_score      numeric,
  status           text check (status in ('Implemented', 'Implemented in another store', 'Not Implemented')),
  reason_code      text,
  closed           boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists activities_planned_store_idx on activities (planned_store_id);
create index if not exists activities_open_idx on activities (closed) where closed = false;
create index if not exists activities_match_method_idx on activities (match_method);

-- -------------------------------------------------------------- submissions
-- Append-only event log. Never update a row; write a new one.
-- The latest row per (store_id, brand, display_type) is the current state.
create table if not exists submissions (
  id                  uuid primary key default gen_random_uuid(),
  activity_id         uuid references activities (id),
  store_id            text not null references stores (id),
  emp_id              text not null references users (emp_id),
  brand               text not null,
  display_type        text not null,
  entered             boolean,
  entry_date          date,
  implementation_date date,
  status              text not null
                      check (status in ('Implemented', 'Implemented in another store', 'Not Implemented')),
  reason_code         text,
  alt_store_name      text,
  note                text,
  -- Always server time. The phone clock is not trusted.
  submitted_at        timestamptz not null default now(),
  approved            boolean not null default false,
  approved_at         timestamptz,

  constraint submissions_reason_shape check (
    (status = 'Implemented' and reason_code in ('Low Stock', 'POSM not received', 'Without POSM'))
    or (status = 'Implemented in another store' and reason_code is null and alt_store_name is not null)
    or (status = 'Not Implemented' and reason_code in (
      'Account Restriction', 'Contract Issue', 'OOS', 'Space Issue', 'POSM not received',
      'Stand not received', 'Stand Damaged', 'Stand Missing', 'Store Refused',
      'Store renovation', 'Store Temporarily Closed', 'Store Permanently Closed', 'Other'))
  )
);

create index if not exists submissions_latest_idx
  on submissions (store_id, brand, display_type, submitted_at desc);
create index if not exists submissions_emp_idx on submissions (emp_id, submitted_at desc);
create index if not exists submissions_activity_idx on submissions (activity_id);

-- ------------------------------------------------------------------- photos
create table if not exists photos (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  r2_key        text not null,
  width         integer,
  height        integer,
  bytes         integer,
  created_at    timestamptz not null default now()
);

create index if not exists photos_submission_idx on photos (submission_id);

-- ------------------------------------------------------------ store_aliases
-- A confirmed link between a Mars store line and one of our stores. Permanent.
create table if not exists store_aliases (
  mars_store_no   text,
  mars_store_name text,
  account         text not null,
  store_id        text not null references stores (id),
  created_at      timestamptz not null default now(),
  primary key (account, mars_store_no, mars_store_name)
);

create index if not exists store_aliases_store_idx on store_aliases (store_id);

-- ---------------------------------------------------------------------- view
-- Current state per line: the newest submission for each store/brand/display.
create or replace view current_state as
select distinct on (store_id, brand, display_type)
  store_id, brand, display_type, id as submission_id, activity_id, emp_id,
  status, reason_code, alt_store_name, implementation_date, submitted_at, approved,
  status in ('Implemented', 'Implemented in another store') as closed
from submissions
order by store_id, brand, display_type, submitted_at desc;
