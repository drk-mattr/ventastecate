-- Seller opt-in WhatsApp contact — NOT yet applied to the live database.
-- Apply in the Supabase SQL editor (same as 018_notifications.sql).
-- Until this runs, the profile field below saves nothing live and the
-- listing-detail WhatsApp button simply does not render.
--
-- Opt-in design: the column is nullable and empty by default. A seller
-- who leaves it blank gets no WhatsApp button and no number anywhere.
-- A seller who fills it in has chosen to be contacted on WhatsApp, and
-- the number is shown only as a wa.me link on their own listings.
--
-- RLS: profiles are already "viewable by everyone" (supabase/schema.sql),
-- so this column inherits that policy — no new policy is needed, and
-- none is added here. That is intentional: a wa.me link on a public
-- listing is only useful if the buyer can open it. Do NOT add a number
-- here unless you want buyers to be able to message you on WhatsApp.

alter table public.profiles
  add column if not exists whatsapp_number text;

comment on column public.profiles.whatsapp_number is
  'Opt-in WhatsApp number (digits only, with country code, e.g. 526641234567). Null = no WhatsApp button on listings.';
