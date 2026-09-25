# AGENTS.md

Instructions for automated writers that publish to this repository.

## Purpose

This repository is a personal distribution layer for structured feeds produced by scheduled ChatGPT tasks.

## Required behavior

1. Write output only in the documented feed format.
2. Set `schema_version` to `1` unless the schema is intentionally versioned.
3. Use UTC RFC 3339 timestamps for `generated_at` and `published_at`.
4. Keep item IDs stable when the same underlying event or item appears again.
5. Keep summaries concise and factual.
6. Preserve source attribution and source URLs.
7. Put videos and other useful external media in `media`.
8. Validate output against `schemas/feed-v1.schema.json` before publishing.
9. Update `data/<feed>/latest.json` on every successful run.
10. Also write a historical snapshot to `data/<feed>/archive/YYYY-MM-DD.json` when appropriate.

## Safety and integrity

- Do not invent sources, URLs, timestamps, or events.
- Do not silently change the schema.
- Do not place secrets, tokens, credentials, or private data in this public repository.
- If generation fails or required evidence is missing, do not replace a valid feed with malformed or speculative output.

## Adding a feed

Create:

```text
data/<feed>/latest.json
data/<feed>/archive/
```

Reuse the common schema unless the feed genuinely requires a new version.

## Viewer

The root-level `index.html`, `app.js`, `data.js`, `styles.css`, and `server.mjs` implement a read-only viewer. It discovers feed tabs from the public GitHub `data/` directory and reads each `latest.json` from the same repository. Keep feed content in the JSON snapshots; do not hard-code articles or tab names in the viewer. Run `npm test` when changing its data loading behavior.
