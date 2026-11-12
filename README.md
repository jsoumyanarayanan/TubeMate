# TUBEMATE frontend

Phases 1 to 14 of 22: foundation, browse, watch, accounts and wallet, ads, live rooms, paid calls, AI characters, extra revenue features, admin and compliance pages, SEO, performance and growth mechanics, interest engine, immersive mood-led UI. Admin is at /admin (demo password: admin).

## Run

    npm install
    npm run dev

Open http://localhost:3000

## Check

- First visit shows the age gate. Nothing behind it can be clicked or tabbed to.
- After entering, a refresh does not show the gate again (30 days).
- Layout holds at 375px, 768px and 1280px.
- Every header and footer link opens a placeholder page. An unknown URL shows the 404 page.
- Region block: `curl -H "x-country: IN" http://localhost:3000` returns only the region notice.

## Where things are

- `src/lib/geo.ts` blocked regions
- `src/lib/ageVerification.ts` age gate storage and the provider stub
- `src/lib/currency.ts` USD and EUR only
- `src/lib/api.ts` the only data access point (mock JSON in `src/data`)
- `src/context/Providers.tsx` useAuth, useWallet, usePaywall (mock)

## Phase 11: SEO, performance and growth

Set `NEXT_PUBLIC_SITE_URL` to the live domain before launch. Canonical tags, sitemaps and JSON-LD all use it.

- `src/lib/seo.tsx` page metadata, canonical and hreflang links, JSON-LD builders
- `src/app/sitemap.ts`, `src/app/video-sitemap.xml/route.ts`, `src/app/robots.ts`, `src/app/manifest.ts`
- `src/lib/i18n.ts` language list (English only) and the note on adding a language
- `src/app/s/[slug]` safe-for-work share page, `src/app/embed/[slug]` embed player, `src/app/(site)/playlist/[id]` public playlist page
- `src/components/Growth.tsx` conversion prompts, install prompt, go-live alerts, rising performers, footer links
- `src/lib/analytics.ts` track(event, props), `src/lib/experiment.ts` useExperiment(name, variants), `src/lib/growth.ts` prompt caps and resume points
- `next.config.mjs` allows thumbnails from any host for now. Narrow it to the media CDN before launch.

Check

- View source on a video, category, tag and performer page: each has its own title, description, canonical link and JSON-LD block.
- `/sitemap.xml` and `/video-sitemap.xml` list every published video. `/robots.txt` blocks /admin, /account and /wallet.
- Share on a watch page gives a `/s/...` link with your referral code. Open it in a private window, press Watch, sign up, then open /referrals.
- As a guest, open six videos: the sign-up prompt shows once. It does not show again that day. Same for the trial banner (after 3 ad views) and the exit offer on /premium (move the pointer out through the top of the page).
- Watch part of a video, go home: it appears under "Continue watching" and resumes where you left it.

Performance checklist (mid-range phone, 4G, production build with `npm run build && npm start`)

- Largest Contentful Paint under 2.5s on home, a category page and a watch page.
- Layout shift under 0.1 on the same pages, both as a guest (ads on) and as a premium member (ads off).
- No horizontal scroll at 375px.
- Only the first two home thumbnails load eagerly. The rest have `loading="lazy"`.
- The network tab on the home page shows no player, room or call code. Those chunks load on /video, /live/[slug] and /calls/[slug] only.
- Every grid shows a skeleton before its data arrives.
- Repeat the run in Lighthouse or PageSpeed Insights once real thumbnails and the CDN are in place. Placeholder media is far lighter than real media.

## Phase 12: interest engine

Personalisation is off until the visitor accepts "Personalise my feed" on the home page. Without consent nothing is stored and the site shows trending and newest only.

- `src/lib/reco/config.ts` every weight and threshold in one place
- `src/lib/reco/events.ts` event tracker and consent, `profile.ts` interest scores with a 14-day half-life and a session profile
- `src/lib/reco/candidates.ts` candidate sources and reasons, `rank.ts` scoring, re-ranking and discovery slots, `velocity.ts` the viral ladder (mock counters), `context.ts` device, time of day and mood
- `src/components/Reco.tsx` consent prompt, taste picker, "For you" row, feed settings
- `/account/feed` see and remove interests, pause history, reset, delete all data. Open to guests. Linked in the footer.
- `/admin/reco` profile, score breakdown per video, weight sliders (saved in the browser only)

Check

- Before accepting, watch a video and search: `tm_reco_events` does not exist in localStorage.
- Accept, watch most of three videos that share a tag: that tag leads /account/feed and the "For you" row changes.
- Slots 5 and 10 of the row carry "New for you". Open one and leave within two seconds, three times: that tag stops appearing.
- "Reset my feed" brings the row back to its first order.
- The three-dot button on a card shows "Why this video", "Show less like this" and "Not interested".

## Phase 13: immersive, mood-led UI

- `/foryou` swipe feed (`src/components/Feed.tsx`). It is the first tab of the phone bottom bar.
- Mood modes: `src/data/moods.json` maps each mood to tags, an accent colour and a motion speed. `src/lib/mood.ts`, `src/components/Mood.tsx`. The accent is the CSS variable `--accent`.
- Player: ambient glow, scene markers from `moments` on each video, previous and next scene buttons, a thumbnail while scrubbing, and a corner mini player on scroll.
- `src/components/MiniPlayer.tsx` keeps a playing video going across page changes.
- Cards play a muted preview on hover or long press. Off for reduced-motion and data-saver users.
- Home opens with "Pick up where you left off", "Because you watched", a stories row of followed performers, mood shortcuts and "Explore" rows.
- Mood search on /search: `src/lib/moodSearch.ts` maps words to tags.
- `/together` watch together for two (Premium). Syncs between two tabs of one browser in the demo.
- `/series` scheduled premieres from `src/data/series.json` with a real countdown.
- Discreet mode and quick exit: `src/components/Discreet.tsx`. Press Esc twice on any page.

Check

- On a phone-sized window open /foryou and swipe: each card fills the screen and the next one is ready.
- Pick a mood in the header: the feed order and the accent colour change at once.
- Play a video, then open another page from the header: the mini player keeps playing.
- Turn on "reduce motion" in the operating system: cards no longer preview on hover.
- Press Esc twice anywhere: the browser goes to a neutral page.
- Update the dates in `src/data/series.json` when they pass, or the countdown has nothing to count to.

## Phase 14: retention loops and revenue weaving

- Stage detection from visits: `src/lib/lifecycle/stage.ts` (new, casual, regular, payer, lapsed). Thresholds are in `src/data/offers.json`.
- Home modules by stage (`src/components/Stage.tsx`) with a next-step card taken from the spending ladder in `offers.json`.
- One contextual offer at a time: `src/lib/lifecycle/offers.ts` (signals and caps) and `src/components/Lifecycle.tsx` (the card and the session reminder). Every offer has an A/B copy test through `useExperiment`.
- Signals are fired from `src/lib/lifecycle/signals.ts`: performer views (follow, then fan club when following), premium locks in the session, category and tag counts, and series episode ends (next episode, or the bundle when the next one is not out).
- Ads by interest: `AdSlot` reads the top category from consented history. Premium members still see no ads.
- Starter token pack: `offers.json` `starterPack`, shown in the buy-tokens modal until the first purchase.
- Return triggers: `src/lib/lifecycle/notify.ts`. Push and email have separate opt-ins and caps (one push a day, two emails a week). Sends are logged to the console and `tm_notify_log`.
- "Your week" recap at `/week`.
- Member controls at `/account/controls`: daily spend limit (blocks token packs and plans that go over it), session reminder, private mode, discreet mode, notification switches, and two-click cancel.
- Owner metrics at `/admin/growth` (link on the admin page). Figures are mock values; experiment results come from `tm_exp_stats`.

Check

- Visit a video page three times across visits: the "Popular with new members" row changes to a stage row, and the next-step card updates.
- Watch the same performer's videos three times: the follow offer appears once, not again until tomorrow, and never within 10 minutes of another offer.
- Edit a `threshold` or `enabled` flag in `src/data/offers.json` and reload: the behaviour changes with no code edit.
- Set a daily spend limit below a token pack price at /account/controls, then buy it: the purchase is blocked with a message that names the limit.
- Turn push alerts off in /account/controls, then trigger a return send: the console shows no push.
- Open /week after watching a few videos: the top categories and suggested watches are filled.
- Open /admin/growth after signing in at /admin: every revenue stream from phases 4 to 9 shows a value.

## Windows: start and deploy

Double-click `deploy.bat` in the project folder. The menu covers install, dev server, production build and start, stopping port 3000, and commit and push to GitHub. Needs Node.js 20 LTS (or newer) and Git.
