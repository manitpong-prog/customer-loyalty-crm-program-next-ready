-- Phase 6D: Point Rules / ตั้งค่ากฎการสะสมแต้ม
-- Run this migration in Neon SQL Editor before deploying the Phase 6D code.
-- Safe for existing production data: only adds new columns with defaults and non-destructive constraints.

alter table shops
  add column if not exists point_rounding_mode text not null default 'floor',
  add column if not exists minimum_purchase_for_points integer not null default 1,
  add column if not exists point_link_expiry_days integer not null default 7,
  add column if not exists point_expiry_days integer not null default 365,
  add column if not exists point_expiry_reminder_days integer not null default 30;

update shops
set
  point_rounding_mode = coalesce(nullif(point_rounding_mode, ''), 'floor'),
  minimum_purchase_for_points = greatest(0, coalesce(minimum_purchase_for_points, 1)),
  point_link_expiry_days = greatest(1, coalesce(point_link_expiry_days, 7)),
  point_expiry_days = greatest(1, coalesce(point_expiry_days, 365)),
  point_expiry_reminder_days = greatest(0, coalesce(point_expiry_reminder_days, 30));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shops_point_rounding_mode_check') then
    alter table shops add constraint shops_point_rounding_mode_check check (point_rounding_mode in ('floor', 'nearest'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'shops_minimum_purchase_for_points_check') then
    alter table shops add constraint shops_minimum_purchase_for_points_check check (minimum_purchase_for_points >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'shops_point_link_expiry_days_check') then
    alter table shops add constraint shops_point_link_expiry_days_check check (point_link_expiry_days > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'shops_point_expiry_days_check') then
    alter table shops add constraint shops_point_expiry_days_check check (point_expiry_days > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'shops_point_expiry_reminder_days_check') then
    alter table shops add constraint shops_point_expiry_reminder_days_check check (point_expiry_reminder_days >= 0);
  end if;
end
$$;
