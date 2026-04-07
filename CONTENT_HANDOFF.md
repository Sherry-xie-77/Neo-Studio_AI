# Neo-Studio Content Handoff

## What the Product Expects

The app expects 30 one-to-one mappings between:

- feed video item
- remake template
- poster image
- preview video

## Already Wired Locally

The first 12 slots already use local assets from `public/media/showcase`.
Those local files are intentionally not committed to git.

## Still Needed From The Team

18 real, distinct video assets plus posters for the remaining slots.
These should be delivered outside repository history, not committed directly into git.

Each asset should ideally include:

- one preview video
- one poster image
- one short English title
- one short Chinese title
- one main English prompt
- one main Chinese prompt
- 2-4 tags

## Suggested Delivery Format

For each missing slot, provide:

```text
slug:
title_en:
title_zh:
prompt_en:
prompt_zh:
tags:
video_file:
poster_file:
```

## Important

- The current app intentionally does not fake 30 different real videos.
- The 18 missing slots are placeholders and should be filled with actual distinct assets before final feed sign-off.
- `public/media/showcase/` is a local-only working directory and is excluded from version control.
- The GitHub repository should contain code, schema, docs, and placeholder/template definitions, not the final real video library.
