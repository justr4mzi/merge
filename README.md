# Merge.

Merge is a revision app for students. You import a lesson (PDF, photos of a notebook, PowerPoint or pasted text) and Merge turns it into a summary and flashcards, then helps you learn them with several study modes. Everything it generates comes from the imported lesson only.

The interface is in French. It works on phones (installable as a PWA) and on desktop.

## Features

- **Import**: PDF, photos (printed or handwritten), `.pptx`, pasted text, or the phone camera. Up to 50 pages per import.
- **Summary**: short by default, with "shorten" and "more detail" buttons. You can edit it by hand.
- **Flashcards**: 10 to 100 cards per import (slider). Each card keeps the sentence of the lesson that justifies it. Cards the lesson does not fully support are flagged "À vérifier".
- **Study modes per chapter**: Cards (spaced repetition), Learn (multiple choice, mistakes come back), Quiz (multiple choice or written answer, marked out of 20), Match, Listen (text to speech), Ask a question about the lesson, Test (unlocked at 100 % mastery), Mock exam (timed), Hard cards.
- **Organisation**: subjects, chapters, one exam date per subject, month calendar, revision plan before an exam.
- **Progress**: daily streak, daily goal, 14-day chart, quiz marks, focus timer.
- **Duo**: two people can share their study statistics (time, cards, streak) with an invitation code. Lessons, summaries and cards always stay private.
- **Settings**: light, dark or system theme, text size, sounds, class, daily goal.

## How it works

Merge is a static site (plain HTML, CSS and JavaScript, no build step) that talks to a Supabase project.

```
Browser (static site)
  ├─ Supabase Auth        Google sign-in
  ├─ Supabase Postgres    data, protected by Row Level Security
  └─ Supabase Edge Function "ai"
        └─ Gemini on Google Vertex AI
```

- **Reading files** happens in the browser. PDFs are read page by page with pdf.js: a page that is plain text is extracted locally, and a page that is scanned or contains a figure is rendered as an image and sent to the AI for transcription. PowerPoint slides are unzipped locally with JSZip.
- **The `ai` Edge Function** is the only place that knows the Google credentials. It checks the signed-in user, applies a daily quota per user, calls Gemini, and logs token usage in the `ai_usage` table. Actions: `transcribe`, `generate`, `verify`, `summary`, `ask`, `quota`.
- **Scheduling** uses FSRS through the `ts-fsrs` library. A card answered "Pas encore" comes back in the same session and is scheduled again soon.
- **Privacy**: every table has Row Level Security, so each user only reads their own rows. The Duo feature goes through SQL functions that expose study statistics only.

## Project structure

```
index.html              entry page
css/app.css             design tokens (light and dark) and components
js/config.js            app name, Supabase URL and publishable key, limits
js/app.js               the whole app: screens, routing, import, study modes
vendor/                 third-party libraries, bundled (no CDN needed)
icons/                  app icons
manifest.webmanifest    PWA manifest
sw.js                   service worker (caches the app shell)
NOTICE.md               third-party licences
```

## Configuration

`js/config.js` holds only public values: the Supabase project URL and its publishable key. No secret belongs in this repository.

The Supabase project needs:

1. **Google sign-in** enabled (Authentication, Providers), and the site address listed in Authentication, URL Configuration (Site URL and Redirect URLs).
2. **An Edge Function secret** named `GCP_SERVICE_ACCOUNT_JSON`, containing the JSON key of a Google Cloud service account allowed to call Vertex AI.
3. Optional secrets: `GEMINI_MODEL` (default `gemini-3.8-flash`), `GEMINI_LOCATION` (default `global`), `AI_DAILY_QUOTA` (default `20`).

The source of the `ai` Edge Function and the database migrations currently live in the Supabase project and are not mirrored in this repository yet.

## Deployment

The site is static, so any static host works. With Cloudflare Pages connected to this repository:

- Framework preset: none
- Build command: none
- Build output directory: `/`

After the first deployment, add the site address to the Supabase URL configuration and to the authorised JavaScript origins of the Google OAuth client.

## Running locally

Serve the folder with any static file server, for example:

```
python3 -m http.server 8080
```

Google sign-in only works from an address that is allowed in the Supabase URL configuration.

## Status

Not built yet: push notifications, a natural AI voice for Listen mode, images on cards, HEIC photo conversion, offline study, and account deletion.

## Licence

Third-party libraries are listed in [NOTICE.md](NOTICE.md).
