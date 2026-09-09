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

-- The current_state view is owned by postgres, which carries BYPASSRLS. Left
-- at the default it would run with the owner's rights, letting anon read every
-- submission through it even though RLS blocks the tables directly.
alter view current_state set (security_invoker = true);

-- The app reaches these tables only through the service role, so anon and
-- authenticated need no grants at all. This keeps a leaked anon key useless
-- even if a future view forgets security_invoker.
revoke all on stores, users, activities, submissions, photos, store_aliases, current_state
  from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
