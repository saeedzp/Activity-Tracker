-- The customer number, for joining our route to Mars' activity files
--
-- Not in the route file yet. It is added here ahead of the data so the column
-- exists on the export from today, and so the importer fills it the moment a
-- route file arrives carrying it — no second migration, no code change at the
-- moment it starts mattering.
alter table stores add column if not exists customer_number text;
