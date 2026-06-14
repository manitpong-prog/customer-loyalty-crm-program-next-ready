-- Phase 6F: Point Expiry Foundation
-- Adds an expiry timestamp for earn transactions.
-- This phase only records and displays expiry information; it does not auto-deduct points yet.

alter table transactions
  add column if not exists points_expires_at timestamptz;

create index if not exists idx_transactions_points_expires_at
  on transactions(points_expires_at);

-- Backfill existing completed earn transactions that do not have expiry yet.
-- Uses each shop's current point_expiry_days setting, defaulting to 365 days.
update transactions t
set points_expires_at = t.created_at + (coalesce(s.point_expiry_days, 365)::text || ' days')::interval
from shops s
where t.shop_id = s.id
  and t.type = 'earn'
  and t.status = 'completed'
  and t.points_expires_at is null;
