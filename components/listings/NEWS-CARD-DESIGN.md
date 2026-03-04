# News & Announcement Card — Design Guidelines

> **Lock-in reference for `listing_type = 'news'` cards in `listing-card.tsx`.**
> Do not alter the structure or visual hierarchy of the news card without reviewing these guidelines first.

---

## Visual Structure

```
┌─────────────────────────────┐
│  ┌───────────────────────┐  │  ← inset image with px-3 pt-3 padding
│  │                       │  │    rounded-xl corners inside the card
│  │        IMAGE          │  │    16:9 aspect ratio, object-cover
│  │                       │  │
│  └───────────────────────┘  │
│ CATEGORY LABEL              │  ← 10px bold uppercase, category color
│ Headline of the article     │  ← 14px semibold, 2-line clamp
│ that wraps here             │
│ Short excerpt from the      │  ← 11px gray, 2-line clamp, flex-1
│ description field...        │
│                             │
│ 11h ago          👁 0  💬 0 │  ← footer pinned to bottom
└─────────────────────────────┘
```

---

## Card Height

**Target: 314px** — must match product/service cards in the same grid row.

This is achieved via:
- `h-full flex flex-col` on the card wrapper
- `aspect-video` (16:9) fixed-ratio image → consistent image height at any column width
- `flex-1` on the excerpt → fills available middle space
- `mt-auto` on the footer → always pinned to bottom

Do **not** set an explicit pixel height. Height is derived from the grid equalizing rows.

---

## Image Rules

- **Aspect ratio:** `aspect-video` (16:9)
- **Fit:** `object-cover` — crops to fill, never letterboxes
- **Placement:** Inset with `px-3 pt-3` padding — image does NOT touch card edges. Inner div has `rounded-xl overflow-hidden` for its own corners.
- **Card shape:** `rounded-2xl` outer card (slightly larger radius than standard cards)
- **No-image fallback:** Light gray (`bg-gray-50`) background with a centered `Newspaper` icon (`h-8 w-8 text-gray-200`). No colored block, no gradient.
- **Closed/sold overlay:** `bg-black/50` with "Cerrado" badge — same as other card types.

---

## Category Label

- **Position:** First element in the content area, **below** the image (not overlaid on it)
- **Style:** `text-[10px] font-bold uppercase tracking-wider leading-none`
- **Color:** Driven by `NEWS_CATEGORY_COLORS` map — each category has its own brand color:

| Category | Color |
|---|---|
| Noticias Locales | `text-blue-600` |
| Objetos Perdidos | `text-amber-600` |
| Seguridad Pública | `text-red-600` |
| Anuncios Comunitarios | `text-green-600` |
| Empleos | `text-purple-600` |
| *(unlisted)* | `text-slate-500` |

- **Adding a new category:** Add an entry to `NEWS_CATEGORY_COLORS` in `listing-card.tsx`. Pick a Tailwind color at the `600` weight for consistency.
- **Hidden when null:** The label only renders if `listing.category` is truthy.

---

## Headline

- `font-semibold text-sm leading-snug`
- **2-line clamp** (`line-clamp-2`) — never grows beyond 2 lines
- Underlines on hover (`group-hover:underline`)
- Margin: `mb-1.5` below category label

---

## Excerpt

- Source: `listing.description`
- **2-line clamp** (`line-clamp-2`)
- Style: `text-[11px] text-gray-500 leading-relaxed`
- `flex-1` — expands to push footer to the bottom
- **Hidden when null:** Only renders if `listing.description` is truthy

---

## Footer

Pinned to the bottom of the content area via `mt-auto pt-2`.

| Element | Icon | Source field | Style |
|---|---|---|---|
| Time ago | — | `listing.created_at` | `text-[11px] text-gray-400` |
| View count | `Eye` (lucide) | `listing.view_count` | `text-[11px] text-gray-400`, `ml-auto` |
| Comment count | `MessageCircle` (lucide) | `listing.comment_count` | `text-[11px] text-gray-400` |

> **Note:** `view_count` and `comment_count` are not yet columns on `listings`. They fall back to `0` via `?? 0`. When added to the DB and included in the query, they will populate automatically — no card changes needed.

---

## Spacing (Content Area)

```
px-3   — horizontal padding (left & right)
pt-2.5 — top padding (between image bottom and category label)
pb-3   — bottom padding
mb-1   — category label → headline gap
mb-1.5 — headline → excerpt gap
pt-2   — footer top padding (from excerpt)
gap-3  — spacing between footer elements
```

---

## What NOT to Change

- Do not remove the `px-3 pt-3` image wrapper padding — the inset look is intentional.
- Do not use `aspect-square` for the news image — that's reserved for product cards.
- Do not use a colored gradient block as a no-image fallback — product/service cards use that pattern; news cards use a neutral gray.
- Do not move the category label back above the image — this was tried and creates uneven card heights when mixed with product cards in the same row.
- Do not remove `h-full flex flex-col` from the card wrapper — required for grid row height equalization.
- Do not use `line-clamp` values greater than 2 on the excerpt — it breaks height uniformity.

---

## File Reference

| File | Role |
|---|---|
| `components/listings/listing-card.tsx` | Card component — news branch is the `if (isNews)` block |
| `lib/types/database.ts` → `ListingWithImages` | Listing type — add `view_count` / `comment_count` here when ready |
| `NEWS_CATEGORY_COLORS` (in listing-card.tsx) | Category → text color map |
