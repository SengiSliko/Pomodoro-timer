# Pomodoro Timer

A minimalist, full-page Pomodoro timer with an animated hourglass. Plain HTML/CSS/JS — no build step, no dependencies.

## Features

- Full-viewport, monochrome design with a live-animating hourglass that doubles as a progress indicator
- Work / short break / long break cycle, with a configurable number of sessions before a long break
- Adjustable durations and sound toggle via the settings panel (persisted in `localStorage`)
- Soft chime + native browser notification on session transitions
- Responsive layout, from phone to desktop

## Running locally

No install step required. From the `app/` directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in a browser.

## Running tests

Pure logic (`timer.js`, `settings.js`) is unit tested with Node's built-in test runner:

```bash
npm test
```

Note: use `npm test` rather than calling `node --test tests/` directly — passing an explicit
path there is broken on some Node versions. The `test` script in `package.json` runs
`node --test` with no path argument, letting Node auto-discover the test files instead.

## Deploying to Vercel

This is a static site — no build command needed.

1. Push this repository to GitHub (or another git provider Vercel supports).
2. In Vercel, "Add New Project" and import the repo.
3. Set the **Root Directory** to `app` (if the repo contains more than just this project).
4. Leave Build Command and Output Directory blank/default — Vercel will serve the static files directly.
5. Deploy.

Alternatively, using the Vercel CLI from the `app/` directory:

```bash
npx vercel --prod
```
