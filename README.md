<p align="center"><img src="icons/icon.svg" width="96" height="96" alt="Merge. logo"></p>

# Merge.

Merge is a revision app for students. You import a lesson (PDF, photos of a notebook, PowerPoint or pasted text) and Merge turns it into a summary and flashcards, then helps you learn them with several study modes. Everything it generates comes from the imported lesson only.

The interface is in French. It works on phones (installable as a PWA) and on desktop.

## Features

- **Onboarding**: name, class, subjects, then the next exam date for each subject picked on a month-view calendar, with a "no exam, free revision" switch.
- **Import**: PDF, photos (printed or handwritten, HEIC included), PowerPoint (`.pptx`, `.ppsx`, legacy `.ppt`), LibreOffice (`.odp`, `.odt`), Word (`.docx`), `.rtf`, `.txt`, `.md`, pasted text, or the phone camera. Any number of files, up to 400 pages per import. Everything is converted in the browser: text-only PDF pages and office documents are extracted locally (slide text, speaker notes, footnotes), and scanned pages, photos and pictures embedded in slides or documents are transcribed by the AI. Legacy `.ppt` yields text only; `.doc`, Keynote and Pages files must be exported to PDF first.
- **Organisation**: subjects (one colour each), folders inside a subject (for example "Theme 1: Genetics"), chapters inside folders. A folder has four tabs: Summaries, Flashcards, Quizzes, Tests.
- **Summary**: the purpose and key notions of the chapter, with "shorten" and "more detail" buttons. Editable by hand.
- **Flashcards**: 10 to 100 cards per import. Each card keeps the sentence of the lesson that justifies it. A card marked wrong goes back into the session queue until it is answered right. A quiz is offered halfway through. At 100 % mastery the chapter test unlocks.
- **AI study modes** (generated once per chapter, then cached): quiz (multiple choice or written), full test, spot-the-mistakes, commonly confused notions with a comparison table, guided exercises with two hints and a worked solution, interactive mind map (pure SVG: zoom, pan, collapsible branches), cloze test, one-page A4 revision sheet.
- **AI feedback modes** (one call per use): blurting (recall everything, then see what was right, forgotten or wrong), Feynman check, AI teacher chat limited to the lesson with "make it concrete" analogies, oral questioning with speech recognition, "why?" explanations in the mistakes notebook, a mnemonic when a card is missed twice.
- **Modes without AI**: boss fight, 60-second flash round with combo multipliers, hands-free audio player (question, pause, answer; Media Session controls), match, true or false, learn, mock exam, printable A4 card sheets (double-sided or fold-over).
- **Progress**: daily streak, daily goal, 14-day chart, quiz marks, mistakes notebook, focus timer, badges.
- **Duo**: two people can share their study statistics with an invitation code. Lessons, summaries and cards always stay private.
- **Settings**: light, dark or system theme, text size, sounds, reminders, archives, data deletion.

## How it works

Merge is a static site (plain HTML, CSS and JavaScript, no build step, no framework) that talks to a Supabase project.

```
Browser (static site)
  ├─ Supabase Auth        Google sign-in
  ├─ Supabase Postgres    data, protected by Row Level Security
  └─ Supabase Edge Function "ai"
        └─ Gemini on Google Vertex AI
```

- **Code layout**: all application code is one IIFE in `js/app.js`. Each screen is a `screenXxx` function and `route()` picks the screen from the URL hash.
- **The `ai` Edge Function** (`supabase/functions/ai/index.ts`) is the only place that knows the Google credentials. It checks the signed-in user, applies a daily quota of 40 calls per user, calls Gemini, and logs token usage in `ai_usage`. All prompts live in the function; the browser only sends the lesson text and an action name. Every prompt restricts the model to the imported lesson. Actions: `quota`, `transcribe`, `generate`, `verify`, `summary`, `study` (kinds `quiz`, `controle`, `pieges`, `faceaface`, `exercices`, `mindmap`, `cloze`, `fiche`), `prof`/`ask`, `concret`, `blurting`, `feynman`, `khole`, `pourquoi`, `mnemo`.
- **Caching**: generated content is stored in memory, in `localStorage` and in the `ai_cache` table (one row per chapter and kind), so reopening a tool never costs a second call. When the quota is reached the app shows a fixed message with a contact link, and every non-AI mode keeps working.
- **Scheduling** uses FSRS through `ts-fsrs`. Chapter mastery is the share of cards whose last answer was right (`cards.mastered`).
- **Privacy**: every table has Row Level Security, so each user only reads their own rows. The Duo feature goes through SQL functions that expose study statistics only.

## Project structure

```
index.html                  entry page
css/app.css                 design tokens (light and dark), components, print styles
js/config.js                app name, Supabase URL and publishable key, limits, contact link
js/app.js                   the whole app: screens, routing, import, study modes
vendor/                     third-party libraries, bundled (no CDN needed)
icons/                      app icons
manifest.webmanifest        PWA manifest
sw.js                       service worker (caches the app shell, push reminders)
supabase/functions/ai/      source of the deployed Edge Function
supabase/migrations/        SQL migrations added since v6 (earlier ones live in the Supabase project)
tests/                      Playwright suite and an in-memory fake Supabase client
NOTICE.md                   third-party licences
```

## Configuration

`js/config.js` holds only public values: the Supabase project URL, its publishable key, the VAPID public key and the "contact the creator" link (`CONTACT_CREATEUR`). No secret belongs in this repository.

The Supabase project needs:

1. **The migrations** in `supabase/migrations/` applied (SQL editor or `supabase db push`). Until `20261113040000_v6_dossiers_cache_erreurs.sql` is applied the app falls back to local storage for the cache, the mistakes notebook, mnemonics and the free-revision flag.
2. **Google sign-in** enabled (Authentication, Providers), and the site address listed in Authentication, URL Configuration (Site URL and Redirect URLs).
3. **An Edge Function secret** named `GCP_SERVICE_ACCOUNT_JSON`, containing the JSON key of a Google Cloud service account allowed to call Vertex AI.
4. Optional secrets: `GEMINI_MODEL` (default `gemini-3.8-flash`), `GEMINI_LOCATION` (default `global`), `AI_DAILY_QUOTA` (default `40`).

Deploy the function with `supabase functions deploy ai --project-ref <ref>`.

## Deployment

The site is static, so any static host works. With Cloudflare Pages connected to this repository:

- Framework preset: none
- Build command: none
- Build output directory: `/`

After the first deployment, add the site address to the Supabase URL configuration and to the authorised JavaScript origins of the Google OAuth client. The OAuth redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.

## Running locally

Serve the folder with any static file server, for example:

```
python3 -m http.server 8080
```

Google sign-in only works from an address that is allowed in the Supabase URL configuration.

## Tests

```
node -c js/app.js
node tests/run.js
```

`tests/run.js` needs Playwright with Chromium. It serves the repository on a local port, replaces `vendor/supabase.js` with `tests/fake-supabase.js` (in-memory tables and a simulated AI), then checks every screen at 390 px and 1280 px in light and dark themes for horizontal overflow, 44 px minimum button height and JavaScript errors. It also runs the main flows: onboarding, folders, import, a card session up to 100 %, quiz and test, each study mode, the quota-reached path and a database without the v6 migration. Set `SHOTS=<dir>` to choose where screenshots are written.

## Status

Not verified against live services yet: Google sign-in, real Gemini calls, real PDF and HEIC imports, speech recognition and lock-screen audio on iOS. Not built: a natural AI voice, chapter sharing.

## Licence

Third-party libraries are listed in [NOTICE.md](NOTICE.md).
