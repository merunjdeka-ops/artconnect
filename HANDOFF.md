# The Local Art Hub — Project Handoff

A working reference to continue development in a new session.

## What this is
**The Local Art Hub** — a local artist booking platform (Italy-based). Live at
**thelocalarthub.com** (and the `www.` variant). Artists list portfolios,
clients book them; plus a swipeable events feed and an admin-run blog.

## Stack & access
- **Framework:** Next.js (App Router, v16.x). Pages are mostly `"use client"`.
- **Repo:** `merunjdeka-ops/artconnect` (GitHub)
- **Working branch:** `claude/artist-dashboard-art-hub-2nsxzm` → open PR →
  **squash-merge to `main`** → Vercel auto-deploys production (~1 min).
- **DB/Auth:** Supabase, project ID `hbtwjerovvtxglbeogoc`
- **Images:** Cloudinary (unsigned upload preset). Helper: `lib/cloudinary.ts` → `cdnUrl(url, transform)`.
- **Email:** Resend, verified sender `noreply@thelocalarthub.com`. Custom SMTP also
  configured in Supabase + email rate limit raised to 150.
- **Admin account:** `merun.jdeka@gmail.com`, profile id
  `230c615d-7a02-4404-9458-cad8edd69c48`, `is_admin = true` (role is `artist`).

## Environment variables (Vercel)
Set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.

**NEEDED (not yet confirmed active):**
- `TICKETMASTER_API_KEY` — for event auto-import. Must be added **and the site
  redeployed** afterward (Vercel only picks up env vars on a new deploy).
- `GEMINI_API_KEY` — for the AI blog auto-writer (Google Gemini free tier;
  aistudio.google.com, no credit card).
- `CRON_SECRET` — any random string; Vercel sends it as a Bearer token to the
  cron route so only the scheduler can trigger it.

## Features shipped (all merged to main)
1. **Signup DB error fixed** — `handle_new_user()` trigger was missing a search
   path; now `SET search_path = public` and inserts into `public.profiles`.
2. **Newsletter signup fixed** — plain INSERT, treat `23505` as success (`/api/newsletter`).
3. **Home categories** → 24 (fills the 4-col grid with no empty cells).
4. **Portfolio** → 20-photo limit + real 3 MB per-file cap.
5. **Cloudinary resize** everywhere via `cdnUrl()` (`lib/cloudinary.ts`).
6. **Signup confirmation emails via Resend** — `/api/signup` uses
   `admin.generateLink` + Resend (bypasses Supabase's throttled mailer).
7. **Forgot-password flow** — `/forgot-password`, `/reset-password`,
   `/api/forgot-password` (recovery link via Resend). "Forgot password?" link on
   `/login`; login honors `?next=`.
8. **Events feed** — home `EventsFeed` (swipeable cards, city filter) +
   `/dashboard/events` (artists post their own).
9. **Admin CMS** — `/admin` (gated by `is_admin`), `/admin/blog`, `/admin/events`
   (all-events + Ticketmaster import), public `/blog` + `/blog/[slug]`, `BlogFeed`
   on home, red "Admin" nav link shown to admins.
10. **AI blog auto-writer** — `/api/cron/generate-blog`, four content types, all
    via the **Google Gemini free tier** with live model discovery (handles free-key
    quirks: rate limits, deprecated/TTS models — see git history on this file for
    the debug trail). Manual "Generate a post now" button in Admin → Blog has a
    type picker; POST body `{ type }`, admin-verified. Needs `GEMINI_API_KEY` +
    `CRON_SECRET`.
    - **`event`** (daily, 09:00 UTC) — roundup from our own real upcoming events.
      Nothing outside our data used → **auto-published**.
    - **`movement`** (weekly, Tue) — general art-history/style guide (Cubism,
      Renaissance, etc., rotated from a static list). Not tied to live data →
      always inserted as a **draft**.
    - **`exhibition`** (weekly, Thu) — real gallery/exhibition news for a rotating
      Italian city, found via **Gemini's Google Search grounding** (`tools:
      [{google_search:{}}]`). Only writes when the API returns real grounding
      source URLs (checked independently of what the model claims) — otherwise
      skips with no post. Always a **draft**; source links stored in
      `posts.source_urls` and shown to the admin (and on the public post, once
      published) for verification.
    - **`celebrity`** ("famous artist visiting Italy") — same grounding
      requirement as exhibitions; same draft + source-link treatment.
    - Cooldown/dedupe via `posts.auto_type` + `posts.auto_topic` (generalizes the
      older `is_auto`/`auto_city` columns, which are kept for the `event` type).
    - Byline: all auto posts get `posts.byline = "The Local Art Hub Editorial
      Team"` — one consistent, honest credit, no fabricated author personas.
    - **STATUS: freshly built, not yet tested by the user** — the `event` type
      was previously confirmed working after a long debug trail (429 → 404 → 400
      → 400 (TTS model) → 404 (deprecated model) → newest-model-first fix). The
      three new types (`movement`/`exhibition`/`celebrity`) share the same
      request/model-discovery code path but have NOT been clicked yet — if they
      fail, check the returned error message first (it now includes real API text).

## Database (migrations applied to the Supabase project)
- **`events`**: title, description, city, venue, event_date, photos[], source
  (`local`/`external`/`ticketmaster`), source_name, external_url, external_id,
  created_by, artist_id, is_published. RLS: public reads published; artists manage
  own; admins manage all. Partial-unique index on `(source, external_id)` for
  import dedupe.
- **`posts`**: title, slug (unique), category (feature/concert/show/event/
  culture/review/news), excerpt, body, cover_url, photos[], is_published,
  published_at, author_id, byline, source_urls[], is_auto, auto_city (legacy,
  `event` type only), auto_type, auto_topic. RLS: public reads published; admins
  manage.
- **`profiles.is_admin`** boolean + **`is_admin()`** security-definer helper.
- Seeded samples (deletable from admin): 3 `[SAMPLE]` events (Florence/Milan),
  1 `[SAMPLE]` blog post.

## OPEN ISSUE — Ticketmaster auto-import not working
- Admin area, manual events, and blog all work (deploy is live; admin confirmed).
- **Only the automatic Ticketmaster import fails.** Box is at the top of
  **Admin → Events** ("Auto-import from Ticketmaster").
- **Route:** `app/api/admin/import-events/route.ts` — admin-verified (bearer token
  → `is_admin`), calls the Ticketmaster Discovery API by city, inserts new events
  via the service role, dedupes on `(source, external_id)`; returns `{ imported, skipped }`.
- **Most likely cause:** `TICKETMASTER_API_KEY` not added to Vercel, or added but
  the site not redeployed. If missing, the route returns "Ticketmaster is not configured."
- **Next steps:** confirm the key exists in Vercel as exactly `TICKETMASTER_API_KEY`,
  redeploy, then test with a large city (London/Milan/Rome). The **exact white
  message** under the box pinpoints it:
  - "not configured" → key missing or not redeployed
  - "Imported 0 events" → works, but no listings for that city
  - "Import failed" / "Ticketmaster request failed" → key invalid or API error

### Key files for the open issue
- `app/api/admin/import-events/route.ts` (importer)
- `app/admin/events/page.tsx` (import UI — `handleImport`)

## How to get a Ticketmaster key
1. developer.ticketmaster.com → register → confirm email → sign in.
2. My Apps → the default app → copy the **Consumer Key**.
3. Vercel → project → Settings → Environment Variables → add
   `TICKETMASTER_API_KEY` = that key (Production) → Save.
4. Redeploy (Vercel → Deployments → ⋯ → Redeploy) so it takes effect.

## Possible next steps / backlog
- Scheduled nightly auto-import for chosen cities (cron/edge function).
- Route password-reset/other auth emails fully through Resend or rely on the
  Supabase custom SMTP now configured.
- Optional dedicated full `/events` page (currently events live on the home feed).
