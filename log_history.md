

## 2026-07-09 - Compact Customer Top Cards Patch v2

### Goal
- Reduce the two top customer UI blocks that were too visually dominant: LINE connection panel and member greeting card.
- Keep the existing LINE login/logout logic intact.

### Files changed
1. `src/components/LineLoginPanel.tsx`
   - Added a real compact render path when `compact` is true.
   - The previous `compact` prop only hid the merchant helper note, so the panel still looked large.
   - New compact UI uses smaller icon, text, button, spacing, and optional small status message.

2. `src/components/CustomerDashboard.tsx`
   - Reduced top body spacing from `pt-4` to `pt-2`.
   - Reduced home tab spacing from `space-y-5` to `space-y-3`.
   - Reduced member greeting card padding, avatar size, LINE badge size, name text size, tier badge size, and claim button size.

### Expected visual result
- The LINE panel becomes a slim single-row banner.
- The member greeting card becomes much shorter and should no longer pull focus from the points/member card below.

### Test commands
```bash
npm install
npm run typecheck
npm run dev
```

### Notes
- No database or SQL changes required.
- No business logic changed.
