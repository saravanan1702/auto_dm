# AutoDM — personal Instagram auto‑DM

A private dashboard for your own Instagram account. It works like the auto‑DM feature in SuperProfile or ManyChat, but just for you:

- **Comment → DM:** someone comments a keyword (e.g. `LINK`) on a reel or post and gets an automatic DM. You can pick one reel or cover all posts.
- **DM → DM:** someone messages you a keyword and gets an automatic reply.
- Optional **public reply** under the comment (a random one from your list, so replies don't look copy‑pasted).
- **Only DM each person once** per automation, and Instagram retries never cause duplicate DMs.
- **Dashboard:** DMs sent (today / 7 days / total), unique people, failures, a 14‑day chart, follower count, and net follower growth over 7 and 30 days.
- **Activity log** with filters (sent / failed / skipped / no match) that shows the exact Instagram error when something fails.
- **Installable on your phone** (PWA): "Add to Home screen" gives it its own icon and full screen, like an app.
- One password protects the whole site. Your Instagram token is stored only on the server and is renewed automatically every day.

Stack: Next.js 16 on **Vercel (free Hobby plan)** + **Neon Postgres (free)**. Everything uses the **official Instagram API**, so you don't share your password and your account isn't at risk the way it is with bots that log in as you.

---

## Honest limits (from Instagram's rules, not this app)

| Thing | Limit |
|---|---|
| Account type | Must be an Instagram **Professional** account (Creator or Business). It's free to switch in the Instagram app. The account must be **public** to get comment events. |
| Comment → DM | Instagram allows **1 private reply per comment**, sent within **7 days** of the comment. |
| DM → DM | You can reply only within **24 hours** of their last message. |
| Volume | Meta limits how many automated messages you can send per hour. Big viral spikes may get some "failed" entries; they show in Activity. |
| "New followers" | The API only gives your **total** follower count, not who followed. So the app saves the count every day and shows **net growth** (followers gained minus lost). It can't say which followers came from DMs. |
| Meta app approval | ⚠️ **Read step 4.4.** To get comment events from *real* people, Meta may need your app in **Live mode** with **Advanced Access** for comments. |

---

## Setup (about 30–45 minutes, one time)

### 1. Instagram
In the Instagram app: **Settings → Account type and tools → Switch to professional account** (Creator is fine).
Then: **Settings → Messages and story replies → Message controls → Connected tools → turn on "Allow access to messages"**. Without this, DMs fail.

### 2. Database (free)
1. Sign up at https://neon.tech, create a project, and copy the **pooled** connection string (`postgresql://…-pooler…`).
2. You don't have to create any tables. The app creates them on first run.

### 3. Deploy to Vercel (free)
1. Push this folder to a **private** GitHub repo.
2. On https://vercel.com: **Add New → Project → import the repo** and deploy (it will show "not connected" until you finish).
3. Note your URL, e.g. `https://my-autodm.vercel.app`.
4. **Project → Settings → Environment Variables:** add every key from [`.env.example`](.env.example). For now, leave `IG_APP_ID` and `IG_APP_SECRET` blank until step 4. Generate random secrets with:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
5. Redeploy after you change env vars (**Deployments → ⋯ → Redeploy**).

### 4. Meta developer app
1. Go to https://developers.facebook.com → **My Apps → Create app**. Pick the use case **"Manage messaging & content on Instagram"**.
2. Open **Instagram → API setup with Instagram login**:
   - Copy the **Instagram app ID** and **Instagram app secret** into Vercel as `IG_APP_ID` and `IG_APP_SECRET`, then redeploy. These are not the Facebook app ID.
   - **Configure webhooks:** Callback URL = `https://YOUR-APP/api/webhook`, Verify token = your `IG_WEBHOOK_VERIFY_TOKEN`. Click **Verify and save**, then subscribe to **comments** and **messages**.
   - **Set up Instagram business login:** add the redirect URL `https://YOUR-APP/api/auth/instagram/callback`.
   - The app's **Settings** page shows all of these URLs, ready to copy.
3. **App settings → Basic:** set Privacy Policy URL = `https://YOUR-APP/privacy`.
4. **Development vs Live mode (important):**
   - In Development mode you can connect your account and test with the dashboard's webhook **Test** buttons.
   - Meta's docs say that **real** comment events need the app in **Live mode**, and they list **Advanced Access** for comment webhooks. Advanced Access needs App Review and Business Verification. First try switching the app to **Live**, then comment from a friend's account. If nothing shows up in Activity, request Advanced Access for `instagram_business_manage_comments` (and `instagram_business_manage_messages`) under **App Review**.

### 5. Connect
Open your site → log in with `ADMIN_PASSWORD` → **Settings → Connect Instagram**. Approve on Instagram's own page. This also subscribes your account to webhooks.

### 6. Test
Create an automation (e.g. keyword `guide`), then from a **different** Instagram account comment "guide" on your reel. You should get the DM within a few seconds, and it appears under **Activity**. Your own comments are ignored on purpose.

### 7. Install on your phone
Open the site on your phone → Android Chrome: **⋮ → Install app / Add to Home screen**. iPhone Safari: **Share → Add to Home Screen**.

---

## Daily job
[`vercel.json`](vercel.json) runs `/api/cron` once a day (00:00 IST). It saves the follower count, renews the Instagram token (tokens last 60 days), and deletes "no match" log entries older than 30 days. Vercel sends `CRON_SECRET` automatically. The dashboard also records followers each time you open it.

## Local development
```
cp .env.example .env.local   # fill values; DATABASE_URL can be a local Postgres (postgresql://postgres@localhost:5432/autodm)
npm install
npm run dev
```
Instagram can't reach `localhost`, so test the real webhook on the deployed URL (or use a tunnel like `ngrok`).

## Project map
- `src/lib/engine.ts` — keyword matching and sending (the core)
- `src/lib/instagram.ts` — Instagram API calls and webhook signature check
- `src/lib/db.ts` — tables and DB client (Neon in production, regular Postgres locally)
- `src/app/api/webhook` — receives comments and DMs from Meta
- `src/app/api/auth/instagram` — Connect Instagram (OAuth)
- `src/app/(app)` — dashboard, automations, activity, settings
- `src/proxy.ts` — password protection for everything except the webhook, cron, privacy page and app icons

## Ideas for later
Follow‑gate ("follow me first to get the link"), buttons/cards in DMs, story‑reply triggers, multiple messages in a sequence, CSV export, multiple accounts.
