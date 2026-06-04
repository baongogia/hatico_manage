# hatico-manager
Next.js (App Router) + TypeScript + Tailwind CSS + Supabase starter.

## Setup
1. Install dependencies (already done after scaffold):
   - `next`, `react`, `react-dom`, `typescript`, `tailwindcss`
   - `@supabase/supabase-js`, `@supabase/ssr`
2. Create local env file:
   - `cp .env.local.example .env.local`
3. Fill in your Supabase project keys in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Run
```bash
npm run dev
```
Open `http://localhost:3000`.

## Supabase helpers
- Browser client: `src/lib/supabase/client.ts`
- Server client: `src/lib/supabase/server.ts`

You can import these helpers in pages, server actions, route handlers, or client components depending on your use case.
# hatico_manage
