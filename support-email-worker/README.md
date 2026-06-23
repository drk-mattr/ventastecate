# Support email → Discord (+ Gmail) worker

A Cloudflare Email Worker that handles `soporte@ventastecate.com`. For every
incoming email it posts a summary to a Discord channel **and** forwards a copy to
your Gmail so you can reply.

This is a **separate Worker** from the main app — deploy it on its own.

## One-time setup

### 1. Enable Email Routing on the domain
Cloudflare dashboard → **ventastecate.com** → **Email** → **Email Routing** →
enable it. This adds the MX records needed to *receive* mail. (Coexists fine with
Resend, which only handles sending.)

### 2. Verify the forwarding inbox
Email Routing → **Destination addresses** → add `rovelo.ga@gmail.com` and click
the verification link Cloudflare emails you. (Required before `message.forward`
will work. If you change `FORWARD_TO` in `wrangler.toml`, verify that address too.)

### 3. Create the Discord webhook
In your Discord server: a channel like **#soporte** → channel settings →
**Integrations → Webhooks → New Webhook** → copy the URL.

### 4. Deploy the worker
```bash
cd support-email-worker
npm install
npx wrangler deploy
npx wrangler secret put DISCORD_SUPPORT_WEBHOOK   # paste the Discord webhook URL
```
(You'll need wrangler authenticated — `npx wrangler login` if it isn't.)

### 5. Route soporte@ to the worker
Email Routing → **Routes** → **Create address** → `soporte@ventastecate.com` →
Action: **Send to a Worker** → select **ventastecate-support-email**.

## Done
Now any email to `soporte@ventastecate.com`:
- drops a clean embed in your Discord #soporte channel, and
- forwards to your Gmail so you can reply.

## Notes
- To reply *as* `soporte@ventastecate.com` (branded), set up Gmail
  "Send mail as" using Resend SMTP — optional, not required.
- Want Discord-only (no Gmail copy)? Remove the `FORWARD_TO` var. Want Gmail-only?
  Skip the Discord secret. The worker no-ops whichever isn't configured.
- The webhook URL is stored as a Worker **secret**, never committed.
