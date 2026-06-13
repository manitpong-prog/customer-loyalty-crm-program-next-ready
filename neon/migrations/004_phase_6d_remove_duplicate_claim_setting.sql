-- Phase 6D cleanup: remove duplicate claim setting
-- Run this only if you already ran the earlier Phase 6D migration that added allow_duplicate_claim_per_link.
-- The product rule is now fixed: one coupon/link can be claimed once only.

alter table shops
  drop column if exists allow_duplicate_claim_per_link;
