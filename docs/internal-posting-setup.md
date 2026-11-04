# Internal posting + moderation setup — ventasTecate.com

Code is in place (endpoints + migration 020). It will NOT post or moderate
until the steps below are done. No further code change is needed after setup.

## Endpoints (same token for both)
- `POST /api/internal/community-post` — news/events only, source required.
  Body: listing_type, title, description, category, location, source.
  Returns the listing id + URL, or 401 / 400 / 503 with a plain reason.
- `POST /api/internal/moderate` — hide / restore only, never delete.
  Body: action (hide|restore), listing_id, reason. Every action is logged
  to moderation_log (migration 020) when that table exists.

Both require header: `Authorization: Bearer <INTERNAL_POST_TOKEN>`

## 1. Create the community account (Greg)
Sign up at ventasTecate.com/signup with an email you control:
- Display name: Ventas Tecate
- Username: ventastecate_comunidad (or set COMMUNITY_USERNAME in Worker vars)
- Bio: Noticias y avisos comunitarios para Tecate y alrededores.
  Información de fuentes públicas.

## 2. Set the token (Greg)
In Cloudflare (Worker ventastecate): set a secret named
`INTERNAL_POST_TOKEN` to a long random value. Give Muse its copy via
Secure Vault only — never in chat. Changing the secret revokes the old token.

## 3. Apply migration 020 (Greg, Supabase SQL editor)
Paste `supabase/migrations/020_moderation_log.sql` and Run. Without it,
moderation still hides/restores but reports logged: false.

## Guardrails
- Community posts: news/events only, source on every post, Greg approves
  before anything goes public.
- Moderation: hide only on clear violations (spam/duplicates, scams,
  prohibited items, offensive content, wrong type/category, fake or
  out-of-coverage location). Ambiguous cases are flagged to Greg, not
  hidden unilaterally. Hides are reversible (restore) and logged.
