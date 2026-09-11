-- A planogram belongs to the campaign, not to a size
--
-- Splitting the drawing by size was a guess about how these files arrive, and
-- it was wrong: one PDF comes with the campaign and shows every stand in it.
-- The employee opens it and finds the one in front of them — which is also why
-- it now appears before the size is chosen rather than after. The drawing is
-- what tells them which size they are looking at.
alter table planograms drop column if exists display_type;
