# Neo-Studio Product Notes

## Core Front-End Shape

Neo-Studio currently has only two product pages:

1. Feed page `/`
2. Create page `/create`

The feed is designed to feel like a short-video platform:

- 4 columns on desktop
- 1 column on mobile
- fixed 9:16 cards
- desktop hover preview
- mobile in-view autoplay
- like, comment, and use-template interactions directly on each card

The create page is designed to feel like a fast remake workspace:

- selected template preview
- model switcher
- one main prompt box
- one-click generation
- in-page generation result state
- template library in the same page

## Current Asset Reality

- 30 feed/template slots exist in the data model
- 12 slots are backed by local real video assets
- 18 slots are placeholders waiting for externally supplied real video + poster assets

Do not treat the 18 placeholders as final launch-ready public content.

## Current Backend Reality

- Model selection UI shows `Kling`, `Veo 3`, `Seedance 2.0`
- Execution currently routes through Kling
- Likes/comments/generation data are stored in the local JSON mock store

## Next Recommended Push

1. Fill the 18 missing real videos and posters
2. Polish feed interactions and visual rhythm
3. Decide whether to migrate the JSON store to Supabase now or after content fill
