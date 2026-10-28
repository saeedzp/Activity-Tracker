-- The question becomes "is the planogram applied?".
--
-- Mars no longer sends the campaign file ahead, so nobody knows which stores
-- will get a stand. Whoever receives one reports it from their own route:
-- yes, or no because stock is short or the planogram has not arrived yet.
--
-- submissions is append-only, so every reason recorded under the old question
-- must still pass. The constraint only widens: Not Implemented now also takes
-- Low Stock and No Planogram.
alter table submissions drop constraint if exists submissions_reason_shape;

alter table submissions add constraint submissions_reason_shape check (
  (status = 'Implemented'
     and (reason_code is null
          or reason_code in ('Low Stock', 'POSM not received', 'Without POSM')))
  or (status = 'Implemented in another store'
     and reason_code is null and alt_store_name is not null)
  or (status = 'Not Implemented'
     and reason_code in (
       'Low Stock', 'No Planogram',
       'Account Restriction', 'Contract Issue', 'OOS', 'Space Issue',
       'POSM not received', 'Stand not received', 'Stand Damaged',
       'Stand Missing', 'Store Refused', 'Store renovation',
       'Store Temporarily Closed', 'Store Permanently Closed', 'Other')
     and (reason_code <> 'Other' or coalesce(btrim(note), '') <> ''))
);

-- Which side of the stand a photo shows: 1 is required, 2 optional.
-- Photos from before this have none, and keep their upload order.
alter table photos add column if not exists position smallint
  check (position in (1, 2));

comment on column photos.position is
  'Side of the stand: 1 (required) or 2 (optional). Null on photos taken before the two-side question.';
