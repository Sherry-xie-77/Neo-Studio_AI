# Neo-Studio

Neo-Studio is a bilingual AI short-video product focused on two front-end pages:

- `/` a TikTok / RedNote-style AI video feed
- `/create` a single-page template remake workspace

The current build is optimized around:

- 4-up desktop feed, 1-up mobile feed
- Hover-to-preview on desktop
- In-view autoplay on mobile
- Anonymous session likes and comments
- One-click jump from a feed video into template remake
- Model selection UI for `Kling`, `Veo 3`, and `Seedance 2.0`
- Beta execution routed through Kling

## Product Status

What is implemented now:

- Two-page front-end structure
- 30 feed/template slots in the data model
- 12 local real video assets wired into the feed
- 18 reserved external-asset slots for the team to fill later
- Lightweight JSON-backed storage for:
  - feed videos
  - templates
  - likes
  - comments
  - generation records
  - anonymous sessions
- API routes for feed, templates, likes, comments, generation submit, generation polling, and provider webhook reconciliation

What is intentionally not finished yet:

- The remaining 18 real videos and posters
- True multi-provider generation backends
- Authentication, pricing, orders, and credits as front-end product flows
- Production database migration from JSON mock store to Supabase tables
- Git-tracked real media delivery

## Routes

Front-end:

- `/`
- `/create`

Redirected/retired front-end routes:

- `/studio/[templateSlug]` -> `/create?template=...`
- `/auth/login` -> `/`
- `/auth/complete` -> `/`
- `/assets` -> `/`
- `/jobs` -> `/`
- `/pricing` -> `/`

API:

- `GET /api/feed`
- `GET /api/templates`
- `POST /api/videos/[id]/like`
- `GET /api/videos/[id]/comments`
- `POST /api/videos/[id]/comments`
- `POST /api/generate`
- `GET /api/generations/[id]`
- `POST /api/provider/webhook`

## Local Development

```bash
npm install
npm run dev
```

Then open:

```bash
http://localhost:3000
```

If that port is occupied, Next.js will automatically choose another one and print it in the terminal.

## Environment Variables

Copy `.env.example` to `.env.local`.

Currently relevant variables:

```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
KLING_API_KEY=
KLING_API_BASE_URL=
KLING_WEBHOOK_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Notes:

- If `KLING_API_KEY` is missing, generation falls back to mock behavior.
- Supabase browser config is present but not yet the production source of truth.
- Stripe variables are still kept in `.env.example` for future reintroduction, but pricing is no longer a front-end page in the current product shape.
- `public/media/showcase/` is intentionally excluded from git tracking.

## Content Asset Model

The app currently distinguishes between:

- `isReady: true`
  Meaning the local asset is wired and visible in the public feed
- `isExternalAsset: true`
  Meaning the slot exists, but the real video/poster must be provided by the team later

Repository rule:

- Real feed video assets are **not** part of the git repository.
- The repo should track code, schema, docs, placeholder/template data, and integration logic.
- Actual video/poster payloads should be handed off externally and mounted or copied into local media storage outside git history.

Important constraint:

- The product model supports 30 feed videos and 30 templates.
- Only 12 feed videos are currently backed by local real assets.
- The remaining 18 must be filled with externally provided real videos before final homepage acceptance.

## Data Storage

The lightweight local store lives at:

- `data/generated/mock-db.json`

That file is runtime-generated and is intentionally excluded from git tracking.

It currently persists:

- anonymous sessions
- likes
- comments
- generation records

If the file contains an old schema, the store auto-resets itself to the current structure.

## Key Files

- `app/page.tsx`
- `app/create/page.tsx`
- `components/feed-client.tsx`
- `components/create-client.tsx`
- `lib/seed-data.ts`
- `lib/server/store.ts`
- `lib/server/generation.ts`
- `lib/providers/kling.ts`

## Verification

The current state has been verified with:

```bash
npm run lint
npm run build
```
