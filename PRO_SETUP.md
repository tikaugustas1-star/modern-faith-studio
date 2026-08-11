# Pro automation setup

The workspace supports explicit TikTok publishing and a server-side scheduled queue.

## 1. Supabase

Create a Supabase project, open **SQL Editor**, and run `supabase-schema.sql`.
The application uses the server-only service/secret key; never expose it in browser code.

## 2. Vercel environment variables

Add these to **Production** and redeploy:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_KEY
CRON_SECRET=GENERATE_A_LONG_RANDOM_SECRET
```

Keep the existing TikTok values too:

```text
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
TIKTOK_REDIRECT_URI=https://modern-faith-studio.vercel.app/api/tiktok/callback
TIKTOK_SESSION_SECRET=...
```

Only add this after TikTok approves the scopes in Developer Portal:

```text
TIKTOK_SCOPES=user.info.basic,user.info.stats,video.list,video.publish
```

## 3. TikTok review and consent

The user must connect TikTok and explicitly add a batch to the queue. The cron worker
only processes queued items after their scheduled time; it does not silently publish
unapproved or unconsented content.

On Vercel Pro, `vercel.json` runs `/api/cron/publish` every minute. The cron route is
protected by `CRON_SECRET` when that variable is configured.
