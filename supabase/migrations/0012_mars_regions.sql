-- Regions named the way Mars names them
--
-- We flattened the west into one "west" while Mars splits it into three units,
-- so every western row we exported was wrong for them. Their naming is adopted
-- wholesale rather than translated at export time: one canonical value, and no
-- mapping step that can drift out of date.
--
-- The route file's own Region column usually just says "West", so the city
-- decides the unit — by province, which is why Taif is Makkah's and Yanbu is
-- Madinah's. A western store whose city cannot be placed stays plain "West":
-- visibly incomplete beats confidently wrong.
update stores set region = case
  when lower(city) in ('jeddah') then 'West - Jed Unit'
  when lower(city) in ('makkah','mecca','taif') then 'West - Mak Unit'
  when lower(city) in ('medina','madinah','al madinah','yanbu') then 'West - Mad Unit'
  else 'West' end
where lower(region) = 'west';

update stores set region = 'South' where lower(region) = 'south';
update stores set region = 'Center' where lower(region) in ('center','central');
update stores set region = 'East' where lower(region) in ('east','eastern');
update stores set region = 'North' where lower(region) in ('north','northern');
