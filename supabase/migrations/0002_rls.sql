-- Row level security.
--
-- The app authenticates by employee number through a server route holding the
-- service role key; the anon key never reads these tables directly. RLS is on
-- with no permissive anon policy, so a leaked anon key exposes nothing.

alter table stores        enable row level security;
alter table users         enable row level security;
alter table activities    enable row level security;
alter table submissions   enable row level security;
alter table photos        enable row level security;
alter table store_aliases enable row level security;

-- The service role bypasses RLS, so no policy is needed for the server routes.
-- Deliberately no policies for anon/authenticated: deny by default.
