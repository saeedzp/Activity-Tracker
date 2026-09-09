-- Brands become data, not code
--
-- Brands were a fixed list in the source, so adding one meant a deploy. They
-- now live in a table with an image, and the admin screen manages them.
create table if not exists brands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  -- Shown above the name on the entry screen; a colour is the fallback.
  image_url  text,
  color      text not null default '#6E685C',
  active     boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists brands_active_idx on brands (active, sort_order, name);

alter table brands enable row level security;
revoke all on brands from anon, authenticated;

insert into brands (name, color, sort_order) values
  ('Galaxy',    '#7B2E8E', 10),
  ('Twix',      '#F5B301', 20),
  ('Snickers',  '#8B3E13', 30),
  ('Bounty',    '#0A7CC4', 40),
  ('Mars',      '#E4002B', 50),
  ('Maltesers', '#A8551F', 60),
  ('Extra',     '#00A868', 70),
  ('Skittles',  '#FF2E88', 80)
on conflict (name) do nothing;

-- A reason code of 'Other' carries no meaning on its own, so the employee
-- types what actually happened and it travels in `note` to the export's
-- Additional Comments column.
comment on column submissions.note is
  'Free text. Required when reason_code = ''Other''; exported in Additional Comments.';

-- Implemented no longer demands a reason code.
--
-- Low Stock, POSM not received and Without POSM qualify an implementation that
-- happened anyway; requiring one forced the employee to claim a problem that
-- may not exist. The codes stay exactly as they are — only the obligation goes.
alter table submissions drop constraint if exists submissions_reason_shape;

alter table submissions add constraint submissions_reason_shape check (
  (status = 'Implemented'
     and (reason_code is null
          or reason_code in ('Low Stock', 'POSM not received', 'Without POSM')))
  or (status = 'Implemented in another store'
     and reason_code is null and alt_store_name is not null)
  or (status = 'Not Implemented'
     and reason_code in (
       'Account Restriction', 'Contract Issue', 'OOS', 'Space Issue',
       'POSM not received', 'Stand not received', 'Stand Damaged',
       'Stand Missing', 'Store Refused', 'Store renovation',
       'Store Temporarily Closed', 'Store Permanently Closed', 'Other')
     -- 'Other' without the explanation is just a shrug.
     and (reason_code <> 'Other' or coalesce(btrim(note), '') <> ''))
);

-- The three permanent stand types (gondola, GMU, the rebrandable metal unit)
-- are re-dressed for each campaign rather than replaced, so the only thing
-- worth asking about them is whether the campaign's own POSM went on.
-- Null everywhere else: the question was never put.
alter table submissions add column if not exists custom_posm boolean;

comment on column submissions.custom_posm is
  'Was campaign-specific POSM fitted? Asked only for GE, GMU and Rebrandable; null otherwise.';
