-- Reset CRM demo/business data only. This keeps all tables and indexes intact.
truncate table point_coupons, transactions, promo_banners, rewards, customers, shops restart identity cascade;
