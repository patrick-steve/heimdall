# Deploying Heimdall

The repository deploys cleanly to two services in tandem:

```
Vercel (free)              Render free Web Service
   /                            /api/*
   /dashboard          ───►     /ws  (WebSocket)
                                FastAPI + uvicorn
```

Total cost: **$0**. The only caveat is Render's free Web Service spins
down after 15 minutes of idle and takes ~30–60 seconds to wake on the
next request. Acceptable for a hackathon demo; if you need always-on,
swap Render for Fly.io (credit card required) or upgrade the Render
service to the $7 starter tier.

---

## Step 1 — Deploy the backend on Render

1. Push this repository to GitHub (already done if you're following the
   README quickstart).
2. Open [render.com](https://render.com), sign in, click **New +** →
   **Blueprint**.
3. Connect your `patrick-steve/heimdall` repo. Render detects the
   `render.yaml` at the root and proposes a service called
   `heimdall-backend`.
4. Click **Apply**. Render starts building. You'll get a URL like
   `https://heimdall-backend-XXXX.onrender.com`.
5. Once the build finishes, open the service's **Environment** tab and
   set:
   - `GEMINI_API_KEY` — your Google AI Studio key. Live Gemini responses
     fall back to a deterministic template if unset, so this is optional.
   - `HEIMDALL_ALLOWED_ORIGINS` — leave blank for now; you'll set this
     after the Vercel deploy in Step 2.
6. Click **Save, rebuild**. Wait until the service is **Live**.
7. Verify: open `https://<your-service>.onrender.com/api/health`. You
   should see:
   ```json
   {"ok": true, "gemini_available": true, "lobster_trap_mocked": true, "sepolia_mocked": true}
   ```

---

## Step 2 — Deploy the frontend on Vercel

1. Open [vercel.com](https://vercel.com), sign in, click **Add New** →
   **Project**.
2. Import your `patrick-steve/heimdall` repo.
3. In the project setup:
   - **Framework Preset**: Next.js (auto-detected).
   - **Root Directory**: click **Edit**, set to `frontend`. This is
     critical, since the Next.js app lives in a subdirectory.
   - **Build Command** + **Output Directory**: leave as defaults.
   - **Environment Variables**: add the following two, both for
     **Production** + **Preview** + **Development**:
     ```
     NEXT_PUBLIC_HEIMDALL_API = https://<your-render-service>.onrender.com
     NEXT_PUBLIC_HEIMDALL_WS  = wss://<your-render-service>.onrender.com/ws
     ```
     (Use `wss://`, not `ws://`. Render serves TLS by default.)
4. Click **Deploy**. Vercel builds; you get a URL like
   `https://heimdall.vercel.app`.

---

## Step 3 — Wire CORS on Render

1. Go back to Render → your service → **Environment** tab.
2. Set `HEIMDALL_ALLOWED_ORIGINS` to your Vercel URL, e.g.:
   ```
   https://heimdall.vercel.app,https://*-patrick-steve.vercel.app
   ```
   The second entry is a glob pattern that matches Vercel preview URLs
   (each PR/branch gets its own). The backend compiles globs into
   regexes for `allow_origin_regex`.
3. Click **Save, rebuild**.

That's it. Open `https://heimdall.vercel.app`, click **Open the
dashboard**, and run a scenario. First request will be slow (~30–60s
cold start); subsequent ones are instant until the next 15-minute idle.

---

## Verifying the live deploy

The dashboard's top-right corner shows live subsystem health:

- `gemini · live` (or `mock` if you skipped the API key)
- `lobster trap · mock` (Veea's Go binary is not deployed)
- `sepolia · mock` (no on-chain transactions on this deploy)
- `ws · connected` (or `down` if CORS / WSS is misconfigured)

If `ws · down`, the most common cause is a missing or wrong
`HEIMDALL_ALLOWED_ORIGINS` on Render.

---

## Optional: making the backend always-on

Render's free Web Services sleep after 15 minutes of inactivity. For a
live demo where you want the first request to be instant:

- **Render Starter ($7/month)**: no sleep, faster CPU. Same code, same
  Blueprint, one dropdown change.
- **Fly.io free machines**: requires a credit card on file but stays
  free for small workloads. You'd write a `fly.toml` instead of using
  `render.yaml`. WebSockets work natively.
- **Cron pinger**: hit `/api/health` every 14 minutes from an external
  cron service (cron-job.org, GitHub Actions on a schedule). Ugly but
  free. Adds non-trivial monthly request count to the free tier; check
  the platform's terms before relying on it.

---

## Local dev still works

None of the deploy configs interfere with the local quickstart:

```bash
python -m pip install -r backend/requirements.txt
cd frontend && npm install && cd ..
python -m scripts.reset_demo
python -m uvicorn backend.main:app --port 8000   # terminal 1
cd frontend && npm run dev                       # terminal 2
```

The frontend's WebSocket and API URLs default to `127.0.0.1:8000`. The
backend's CORS defaults to allowing `localhost:3000` when
`HEIMDALL_ALLOWED_ORIGINS` is unset.

---

## Costs at a glance

| Service           | Plan          | Cost  | Trade-off                       |
|-------------------|---------------|-------|----------------------------------|
| Vercel Hobby      | Free          | $0    | Always-on, no caveats.          |
| Render Web Service| Free          | $0    | 15-min idle sleep, ~45s wake.   |
| Render Web Service| Starter       | $7/mo | Always-on, more RAM/CPU.        |
| Gemini API        | Free tier     | $0    | Flash only; Pro is rate-limited.|

Default deployment: $0. Upgrade Render to Starter if you need
demo-day always-on.
