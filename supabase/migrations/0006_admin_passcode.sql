-- Where the admin passcode lives
--
-- Not in the repository and not in a build variable: the project is public, and
-- a code committed once is leaked forever. Keeping it here also means changing
-- it needs no redeploy.
--
-- Stored as a salted SHA-256. The hash is not the defence — a four-digit code
-- falls to anyone who already has the database. The defence is that the code
-- appears in no file anyone can read, plus the delay on a wrong attempt.
create table if not exists app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;
revoke all on app_settings from anon, authenticated;

-- The passcode itself is set from outside this file. To change it:
--   salt = random 16 bytes as hex
--   hash = sha256(salt || ':' || passcode)
-- then upsert both keys below.
