# Customer Loyalty CRM Program

Next.js production baseline converted from the original AI Studio mock-up.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
```

## Docs

- Deployment guide: `docs/DEPLOYMENT_GUIDE_TH.md`
- Neon schema draft: `neon/schema.sql`

## Important status

The current UI is now buildable as a Next.js app, but the business data layer still uses browser `localStorage` from the original mock-up. Use this as the deployable prototype baseline before migrating reads/writes to Neon via Next.js API routes or Server Actions.
