### YYYY-MM-DD HH:MM - Compact member banner patch

- **Changed** `src/components/CustomerDashboard.tsx`
  - Set `<LineLoginPanel>` `compact` prop to make LINE panel tiny.
  - Removed `-mx-1` wrapper negative margin (replaced with `mt-2`).
  - Reduced greeting card padding from `p-4` → `p-2`.
  - Avatar size `h-20 w-20` → `h-12 w-12`.
  - Display name font size `text-[22px]` → `text-[16px]`.
  - Result: Two large boxes at top now ~60% shorter and less visually dominant.

Terminal commands used:
```bash
git checkout -b feat/compact-member-banner
# edit file ...
git add src/components/CustomerDashboard.tsx
git commit -m "refactor: compact greeting + line panels on customer dashboard"
```
