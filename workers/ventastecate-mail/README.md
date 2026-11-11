# hola@ → admin alerts (+ Gmail) worker

A Cloudflare Email Worker that handles `hola@ventastecate.com`. For every
incoming mail it posts a parsed alert to the app (listed at
`/admin/alerts` for superadmins) **and** forwards the original to Gmail
so it can be read and replied to.

This is a **separate Worker** from the main site (`ventastecate`) — deploy
it on its own. It has no npm dependencies: MIME parsing is hand-rolled
(single-part and multipart `text/plain`, base64 / quoted-printable,
RFC 2047 subjects).

## One-time setup

### 1. Deploy the worker

```bash
cd workers/ventastecate-mail
npx wrangler deploy
npx wrangler secret put INTERNAL_POST_TOKEN   # same value as the site Worker's secret
```

### 2. Route hola@ to the worker

Cloudflare dashboard → **ventastecate.com** → **Email** → **Email Routing**
→ **Routing rules** → edit the `hola@ventastecate.com` rule → change the
action from **Send to destination address** to **Send to a Worker** →
select **ventastecate-mail**. (The worker forwards to Gmail itself, so
Gmail delivery is preserved.)

## Done

Now any mail to `hola@ventastecate.com`:

- lands on `/admin/alerts` (newest first, mark as read / archive), and
- still forwards to `rovelo.ga@gmail.com`.

## Notes

- If the alert POST fails, the forward still happens — the worker logs
  the failure with `console.error` and never blocks Gmail delivery.
- The body stored in the app is plain text only, truncated to 8000
  characters; no attachments are stored.
