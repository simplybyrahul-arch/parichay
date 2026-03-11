# Deployment Notes

## Build

```bash
npm run build
```

## Start

```bash
npx next start -p 3001
```

## Required Environment Variables

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

## Known Runtime Notes

- If hydration warnings include `fdprocessedid`, this can be caused by browser extensions modifying DOM before React hydration.
- `middleware.ts` deprecation warning may appear on Next.js 16+ and can be migrated to `proxy` convention later.
