# Ventas Tecate

A local-marketplace web app where people list and discover **products, services, events, and news** in their community, message sellers directly, and run their own **stores** — no payments or shopping cart (buyers and sellers connect and transact directly).

> **MVP status:** The app is built as a multi-region, multi-language, multi-brand
> platform, but for the initial launch it is **locked to a single market — Tecate,
> Baja California, Mexico** — to build local density. See "MVP lock" below.

## Features

- **Authentication** — email/password signup, login, password reset; protected routes.
- **Listings** — products, services, events, and news, each with type-specific fields
  (real estate: bedrooms/bathrooms/m²; automotive: make/model/mileage). Up to 5 images
  per listing via Supabase Storage. Create, edit, mark sold/inactive.
- **Stores** — general, real-estate, and automotive stores with public pages and slugs.
- **Search & filters** — full-text search, category, location (free-text + GPS), price, sort.
- **Messaging** — buyer↔seller conversations with history and email notifications.
- **Social** — follows, comments, and a report flow (routed to Discord).
- **i18n** — Spanish, Tagalog, English, Indonesian (currently pinned to Spanish for MVP).
- **Multi-brand / multi-region** — same engine serves Ventas Tecate (Mexico) and Papryka
  (generic/global); regional listing filtering by country. (Dormant during MVP.)
- **SEO** — localized metadata, OpenGraph/Twitter cards, sitemap.

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling/UI:** Tailwind CSS v4, shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage), with Row-Level Security
- **Email:** Resend
- **Deployment:** Cloudflare (via OpenNext / Wrangler) — `npm run deploy`

## MVP lock (Tecate, Mexico)

All MVP scoping lives behind a single switch in [`lib/mvp-config.ts`](lib/mvp-config.ts):

```ts
export const LOCK_TO_TECATE = true   // set to false to re-enable multi-region
```

While `true`, the app:
- forces **Spanish (`es-MX`)** regardless of the visitor's detected country, and
- pins the market to **Mexico (`MX`)** for listing filtering, and
- hides the **worldwide / "see all regions"** toggles, and
- shows the **Ventas Tecate** brand everywhere (no Papryka leak).

This fixes the border-town case where Tecate locals on US IPs (`cf-ipcountry = US`)
would otherwise see the site in English with no listings. To expand later (e.g. the
Philippines), set `LOCK_TO_TECATE = false` — the multi-region code is intact, just bypassed.

## Getting Started

```bash
npm install
npm run dev      # http://localhost:3000
```

### Supabase
Follow `supabase/README.md`: create a project, run `supabase/schema.sql` then the
files in `supabase/migrations/`, and add your keys to `.env.local`.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=https://ventastecate.com
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX        # Google Tag Manager container (required for analytics)
RESEND_API_KEY=your-resend-key
DISCORD_WEBHOOK_URL=...               # report form
DISCORD_NEW_USER_WEBHOOK_URL=...      # new-registration notifications
```

> ⚠️ `NEXT_PUBLIC_GTM_ID` must be set in the production environment (Cloudflare) or
> analytics will not fire — it currently falls back to a placeholder.

## Key Pages

`/` home · `/search` · `/listings/new` · `/listings/[id]` · `/my-listings` ·
`/stores/[slug]` · `/messages` · `/users/[username]` · `/profile/edit`

## Deployment

Deployed on Cloudflare via OpenNext:

```bash
npm run deploy        # opennextjs-cloudflare build && deploy
```

Set all environment variables in the Cloudflare dashboard before deploying.

---

Built for the Tecate community.
