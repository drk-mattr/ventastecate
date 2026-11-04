# Facebook login setup — ventasTecate.com

Code is already in place (login/signup button + profile link/unlink).
It will NOT work until the steps below are done. No code change is needed
after setup — the button starts working once Supabase accepts Facebook.

## 1. Create a Facebook developer app (Greg, ~15 min)
1. Go to https://developers.facebook.com/apps — log in with your Facebook
   account, Create App, type "Other" / "Consumer" is fine for login-only.
2. Name it `ventasTecate` (no Facebook Page is required for login).
3. Add product: Facebook Login. In Facebook Login > Settings, add this
   Valid OAuth Redirect URI:
   `https://afhcrjuezhjsfzampbsz.supabase.co/auth/v1/callback`
   (that is the Supabase project host already in the repo config).
4. In Settings > Basic, copy the App ID and App Secret. Do NOT paste
   them in chat — they go into Supabase in step 2, and only there.
5. While the app is in Development mode, only test users / app roles
   can log in. Before launch, switch the app to Live in the dashboard
   (App Review is not required for email + public_profile login).

## 2. Enable Facebook in Supabase Auth (Greg, ~5 min)
1. Supabase dashboard > your ventasTecate project > Authentication >
   Providers > Facebook > Enable.
2. Paste the App ID (Client ID) and App Secret (Client Secret) from step 1.
3. Save. The Redirect URL shown by Supabase must match the URI in step 1.3.

## 3. Test it
1. Log out of ventasTecate.com, go to /login, tap "Continuar con Facebook".
2. Approve on Facebook, confirm you land back on the homepage logged in,
   with a profile (display name from Facebook if no profile existed).
3. Existing account: log in with email, go to Profile > Edit > Facebook >
   "Vincular Facebook", approve, confirm it shows as linked. Next login
   can use either Facebook or email.

## Troubleshooting
- "Provider is not enabled" on /login: step 2 is not done yet.
- Facebook error "URL blocked" / "redirect_uri": the URI in step 1.3
  does not exactly match Supabase's callback URL.
- Facebook login works but lands on /login?error=auth_callback_failed:
  the code exchange failed — check Supabase Auth logs, then the App
  Secret in step 2.
- A Facebook email that already has an email/password account: sign in
  with email first, then use Profile > Edit > Vincular Facebook to link
  them, instead of creating a second account.
