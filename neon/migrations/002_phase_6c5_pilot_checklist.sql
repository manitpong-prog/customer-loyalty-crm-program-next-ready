-- Phase 6C.5: Pilot Checklist with Database persistence
-- Run this once in Neon SQL Editor before deploying the Phase 6C.5 code.

create table if not exists shop_onboarding_checklists (
  id text primary key,
  shop_id text not null references shops(id) on delete cascade,
  rich_menu_configured boolean not null default false,
  tested_in_line_browser boolean not null default false,
  tested_customer_claim boolean not null default false,
  tested_reward_redeem boolean not null default false,
  test_data_cleaned boolean not null default false,
  reviewed_customer_messages boolean not null default false,
  ready_for_pilot boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_onboarding_checklists_shop_unique unique (shop_id)
);

create index if not exists idx_shop_onboarding_checklists_shop_id
  on shop_onboarding_checklists(shop_id);

-- Create a default checklist row for every existing shop.
insert into shop_onboarding_checklists (id, shop_id, created_at, updated_at)
select 'onboarding_' || id, id, now(), now()
from shops
on conflict (shop_id) do nothing;
