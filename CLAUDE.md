# flashcards

Personal Chinese vocabulary flashcard app. PWA, local-first, no backend.
Deployed to GitHub Pages from `main`.

## Rules

### 1. TDD

Write the test first, watch it fail for the right reason, then write the minimal
code that passes. Applies to logic — the SRS scheduler, deck state, storage
serialization. Do not TDD pure layout/CSS; verify that by looking at it.

Run: `npm test`

### 2. Commit and push, always

Commit after every working increment (green tests + feature actually runs).
Push immediately — no local-only work. Small atomic commits so any step can be
rolled back with `git revert`.

### 3. Keep it small

No backend, no accounts, no analytics, no dependency that a few lines of code
replaces. Data lives on the device; JSON export/import is the backup story.

## Gotchas

- `vite.config.ts` sets `base: '/flashcards/'` for GitHub Pages. Any absolute
  asset path must go through `import.meta.env.BASE_URL`.
- iOS Safari records audio as `audio/mp4`, not `audio/webm` — never hardcode a
  MediaRecorder mimeType.
- The app is precached by a service worker, so a deploy does not reach an open
  installed app until the user taps the "New version" banner. When testing a
  change on a real phone, expect one extra reload.
- `npm run preview` serves the built app with the service worker; `npm run dev`
  does not precache. Test offline behaviour against preview only.
