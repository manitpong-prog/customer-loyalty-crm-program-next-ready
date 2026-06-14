-- Phase 6G: Vercel Blob Image Storage
-- Adds URL/storage-key columns while keeping legacy data URL/text columns as fallbacks.

alter table shops
  add column if not exists logo_url text,
  add column if not exists logo_storage_key text;

alter table rewards
  add column if not exists image_url text,
  add column if not exists image_storage_key text;

alter table promo_banners
  add column if not exists image_url text,
  add column if not exists image_storage_key text;

-- Backfill URL fields only for existing http(s) image values. Existing data:image/... values stay in legacy columns.
update shops
set logo_url = logo
where logo_url is null
  and logo ~* '^https?://';

update rewards
set image_url = image
where image_url is null
  and image ~* '^https?://';

update promo_banners
set image_url = image
where image_url is null
  and image ~* '^https?://';
