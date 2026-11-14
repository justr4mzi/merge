<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="icons/logo-dark.svg"><img src="icons/logo.svg" width="360" alt="Merge."></picture></p>

Merge is a revision app for students. You import a lesson (PDF, photos of a notebook, PowerPoint or pasted text) and Merge turns it into a summary and flashcards, then helps you learn them with several study modes. Everything it generates comes from the imported lesson only.

The interface is in French. It works on phones (installable as a PWA) and on desktop.

## Features

- **Onboarding**: name, class, subjects (suggested for the chosen class, plus names already used by students of the same class), then the next exam date for each subject, with a "no exam, free revision" switch.
- **Import**: PDF, photos (printed or handwritten, HEIC included), PowerPoint (`.pptx`, `.ppsx`, legacy `.ppt`), LibreOffice (`.odp`, `.odt`), Word (`.docx`), `.rtf`, `.txt`, `.md`, pasted text or the phone camera, up to 400 pages per import. Text is extracted in the browser; scanned pages and pictures are transcribed by the AI. The `studio` Edge Function runs the import as a server-side job, so it continues when the app is closed, and a push notification announces the result. A chapter can be named automatically from the imported lesson.
- **Organisation**: subjects (one colour each), folders inside a subject, chapters inside folders. Add and settings buttons sit in the top-right corner of each subject and folder. A folder opens on its Chapters tab, then Summaries, Flashcards, Quizzes and Tests.
- **Summary and flashcards**: a summary of the chapter's purpose and key notions, and 10 to 100 cards per import, each keeping the sentence of the lesson that justifies it. Spaced repetition with FSRS, an undo button for a mistaken answer, and a chapter test that unlocks at 100 % mastery.
- **AI study modes** (generated once per chapter, then cached): quiz, full test, spot-the-mistakes, commonly confused notions, guided exercises, interactive mind map, cloze test (with believable wrong options), one-page A4 revision sheet, written test. Every mode can be regenerated at the end.
- **AI feedback modes**: blurting, Feynman check, AI teacher limited to the lesson, oral questioning with speech recognition ("Khôlle"), "why?" explanations, mnemonics.
- **Modes without AI**: boss fight, 60-second flash round, hands-free audio, match, true or false (with lookalike traps), learn, mock exam, printable card sheets. Printing works in the installed iPhone app too (the sheet is turned into a PDF and shared).
- **Reminders**: daily reminder only if the student has not studied yet that day, a "your streak ends tonight" reminder at 9 pm, exam reminders (one week, three days, the day before, the morning of the exam). Synced settings: reminders on or off, quiet weekends, quiet school holidays (French zones A, B, C).
- **Motivation**: levels, points, badges, daily streak with one freeze per week, a weekly chart that stays readable on light days, and a **shop**: coins earned by studying (1 per right answer, 10 per mastered chapter, a bonus per level) buy themes, animated backgrounds, mascot outfits, flashcard styles, streak flame colours, titles and surprise chests. Each new level gives coins, a free item and a chest every five levels.
- **Real gifts (optional)**: a list of real-life rewards (in `GIFTS`, `js/app.js`) shown only to accounts enabled in the admin page. Claiming one shows a voucher to screenshot and send, and the request appears in the admin page until it is marked as given.
- **Study comfort**: quick search, adjustable Pomodoro or free timer, background music with artwork, read-aloud, highlights, personal notes, statistics, image occlusion.
- **Duo**: two students share their study statistics with an invitation code, a copy button or a share link that opens the app with the code filled in. Lessons and cards stay private.
- **Admin page** (`/admin`, password protected): students, screen time, AI usage, and real gift access and requests.

## How it works

Merge is a static site (plain HTML, CSS and JavaScript, no build step, no framework) that talks to a Supabase project.

```
Browser (static site, installable PWA)
  ├─ Supabase Auth        Google sign-in
  ├─ Supabase Postgres    data, protected by Row Level Security
  └─ Supabase Edge Functions
        ├─ ai        prompts and calls to Gemini on Google Vertex AI
        ├─ studio    server-side imports and free requests
        ├─ remind    push reminders (called every 15 minutes by pg_cron)
        ├─ voix      natural read-aloud voice
        └─ admin     data for the admin page
```

- **Code layout**: all application code is one IIFE in `js/app.js`. Each screen is a `screenXxx` function and `route()` picks the screen from the URL hash.
- **The `ai` Edge Function** (`supabase/functions/ai/index.ts`) is the only place that knows the Google credentials. It checks the signed-in user, applies a daily quota of 40 calls per user, calls Gemini, and logs token usage in `ai_usage`. All prompts live in the function; the browser only sends the lesson text and an action name. Every prompt restricts the model to the imported lesson. Actions: `quota`, `transcribe`, `generate`, `verify`, `summary`, `study` (kinds `quiz`, `controle`, `pieges`, `faceaface`, `exercices`, `mindmap`, `cloze`, `fiche`), `prof`/`ask`, `concret`, `blurting`, `feynman`, `khole`, `pourquoi`, `mnemo`.
- **Caching**: generated content is stored in memory, in `localStorage` and in the `ai_cache` table (one row per chapter and kind), so reopening a tool never costs a second call. When the quota is reached the app shows a fixed message with a contact link, and every non-AI mode keeps working.
- **Scheduling** uses FSRS through `ts-fsrs`. Chapter mastery is the share of cards whose last answer was right (`cards.mastered`).
- **Privacy**: every table has Row Level Security, so each user only reads their own rows. The Duo feature goes through SQL functions that expose study statistics only.

## Project structure

```
index.html                  entry page
admin/index.html            admin page (password checked by the admin Edge Function)
privacy.html                privacy page
css/app.css                 design tokens (light and dark), components, print styles
js/config.js                app name, Supabase URL and publishable key, VAPID public key, music list, contact link
js/app.js                   the whole app: screens, routing, import, study modes, shop
vendor/                     third-party libraries, bundled (no CDN needed)
icons/, images/, audio/     app icons, music artwork, background music
manifest.webmanifest        PWA manifest
sw.js                       service worker (app shell cache, push notifications)
supabase/functions/         source of the deployed Edge Functions (ai, studio, remind, voix, admin)
supabase/migrations/        SQL migrations added since v6 (earlier tables live in the Supabase project)
supabase/optional/          SQL that is ready but not applied
tests/                      Playwright suite and an in-memory fake Supabase client
tools/                      scripts used to cut the background music into tracks
DECISIONS.md                log of every product and technical decision, in French
NOTICE.md                   third-party licences and image credits
```

## Configuration

`js/config.js` holds only public values. No secret belongs in this repository.

The Supabase project needs:

1. **The migrations** in `supabase/migrations/`, applied in order (SQL editor or `supabase db push`).
2. **Google sign-in** enabled (Authentication, Providers), and the site address in Authentication, URL Configuration.
3. **Edge Function secrets**: `GCP_SERVICE_ACCOUNT_JSON` (JSON key of a Google Cloud service account allowed to call Vertex AI). Optional: `GEMINI_MODEL`, `GEMINI_LOCATION`, `AI_DAILY_QUOTA` (default 40 calls per user and day), `TTS_VOICE`, `TTS_MONTHLY_FREE`.
4. **A `public.app_secrets` table** (name, value; readable by the service role only) with: `cron` (a random string sent by pg_cron in the `x-cron-secret` header), `vapid_public` and `vapid_private` (Web Push keys; the public one is also in `js/config.js`), and `admin_pw_sha256` (SHA-256 hex digest of the admin password).
5. **A pg_cron job** that calls the `remind` function every 15 minutes with the `x-cron-secret` header.

Deploy the functions with `supabase functions deploy <name> --project-ref <ref>`; `ai` keeps JWT verification, the others check their own secret or password.

### Making it your own

- Change the name, colours and links in `js/config.js` and `css/app.css`.
- Replace the real gifts in `GIFTS` (`js/app.js`) and the allowed list in the `gift_claims` check constraint, or leave them: nobody sees them until an account is enabled in `/admin`.
- The music and its artwork are listed in `js/config.js`; replace them with tracks and images you are allowed to use (see `NOTICE.md`).

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

`tests/run.js` needs Playwright with Chromium. It serves the repository on a local port, replaces `vendor/supabase.js` with `tests/fake-supabase.js` (in-memory tables and a simulated AI), then checks every screen at 390 px and 1280 px in light and dark themes for horizontal overflow, 44 px minimum button height and JavaScript errors. It also runs the main flows: onboarding, folders, import, a card session up to 100 %, quizzes and tests, each study mode, reminders logic, shop and gifts, Duo links, printing as PDF and the quota-reached path. Set `SHOTS=<dir>` to choose where screenshots are written.

## Status

Live in production. Checked by the automated suite only (not on a real device): speech recognition on iOS, printing from the installed iPhone app, and real push notifications for the new reminders.

## Licence

Third-party libraries are listed in [NOTICE.md](NOTICE.md).
