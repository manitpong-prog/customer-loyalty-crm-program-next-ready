-- Phase 7D/7E: Online-only merchant settings, rewards, banners, and reduced legacy localStorage sync
-- Run this once in Neon SQL Editor before deploying the Phase 7D/7E code.
-- Non-destructive: only adds missing columns for merchant-facing settings that were previously local-cache only.

alter table shops add column if not exists welcome_message text not null default '';
alter table shops add column if not exists contact_text text not null default '';
alter table shops add column if not exists share_message_template text not null default '';
alter table shops add column if not exists rich_menu_contact_url text not null default '';

-- Preserve existing shops; no data is deleted.
