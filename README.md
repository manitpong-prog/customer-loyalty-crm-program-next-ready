# Customer Loyalty CRM Program

Next.js production baseline converted from the original AI Studio mock-up, upgraded with Neon Database Integration, and prepared for a clean pilot baseline.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
```

## Neon status

This version adds server-side Neon routes:

- `GET /api/db/snapshot` loads all CRM data from Neon and can seed `pilot`, `demo`, or `none` depending on `CRM_AUTO_SEED`.
- `POST /api/db/sync` persists browser-side changes back to Neon.
- `POST /api/db/reset` can clear or reseed test data only when `ALLOW_DB_RESET=true`.
- `GET /api/db/health` checks that the app can reach Neon and returns row counts.

The current UI still uses a browser local cache for responsiveness, but Neon is now the shared backend source used at startup and after each save.

## Environment variables

Create `.env.local` locally and set the same value in Vercel Project Settings > Environment Variables:

```env
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_DEFAULT_SHOP_ID="im_sticker"
CRM_AUTO_SEED="pilot"
ALLOW_DB_RESET="false"
```

If you connected Neon through the Vercel Marketplace integration, Vercel should already have `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.

## Docs

- Deployment guide: `docs/DEPLOYMENT_GUIDE_TH.md`
- Neon schema: `neon/schema.sql`
- Reset SQL: `neon/reset-demo.sql`
- Pilot seed SQL: `neon/seed-pilot-im-sticker.sql`
- Production data cleanup: `docs/PRODUCTION_DATA_CLEANUP_TH.md`

## Production UI Routes

หลังทำ Production UI Cleanup Phase 1 แล้ว route จะแยกเป็น:

- `/` หน้า Landing จริงสำหรับเลือกเข้าใช้งาน
- `/customer` หน้าลูกค้าแบบ production view
- `/merchant` หลังบ้านร้านค้า
- `/admin` ผู้ดูแลเว็บไซต์
- `/demo` หน้า prototype/demo รวมทุกบทบาทสำหรับ debug ภายใน

รายละเอียดเพิ่มเติมดู `docs/PRODUCTION_UI_CLEANUP_TH.md`

