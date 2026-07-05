# Pomodoro Timer — Design Spec

Date: 2026-07-05

## Overview

A single-page, static Pomodoro timer web app. Full-viewport, minimalist aesthetic
(light grey background, monochrome accents), centered around an animated
hourglass that visually doubles as the session's progress indicator. Deploys
to Vercel as a static site with no build step.

## Visual Layout

Full-viewport page, vertically and horizontally centered content stack, on a
light grey background (not pure white).

Top to bottom:
1. Animated hourglass (SVG)
2. Large, thin-weight digital clock (e.g. `24:53`)
3. Small uppercase caption showing session type and progress
   (e.g. `FOCUS · 2 OF 4`, `SHORT BREAK`, `LONG BREAK`)
4. Control row: Reset icon — Play/Pause (primary, filled, larger) — Settings gear

All accents (hourglass glass outline, sand, primary button fill) are
monochrome black on the grey background.

This exact visual treatment — layout, hourglass component, monochrome
styling, control row — is shared identically across all three session
types (Focus, Short Break, Long Break). Only the caption text and the
duration the hourglass drains over change; there is no separate "break
mode" skin or color shift.

## Hourglass Animation

- SVG hourglass with two bulbs and a neck.
- Sand drains from the top bulb into the bottom bulb over the course of the
  active session; the fill level of each bulb tracks time remaining, so the
  hourglass is a literal progress bar.
- A continuous trickle animation (small falling grain marks) plays in the
  neck whenever the timer is running, and freezes when paused.
- On session end, the hourglass resets/flips to full for the next session type.

## Controls

- **Reset** — returns the current session to its full configured duration.
- **Play/Pause** (primary button, visually dominant) — toggles the countdown.
- **Settings** (gear icon) — opens the settings panel.

## Settings Panel

Opened via the gear icon. Fields:
- Work duration (minutes)
- Short break duration (minutes)
- Long break duration (minutes)
- Sessions before a long break (count, default 4)
- Sound on/off toggle

Values persist to `localStorage`. Saving resets the current session to the
(possibly new) duration for its type.

On narrow viewports (phones), the settings panel becomes a full-screen sheet
instead of a centered modal dialog.

## Behavior / State Machine

- Session types cycle: Work → Short Break → Work → Short Break → ... →
  Work → Long Break → (repeat), with the long break triggered after the
  configured number of work sessions.
- Play/Pause toggles the countdown timer.
- Reset restores the current session's full duration without changing session
  type or position in the cycle.
- On countdown reaching zero:
  - Play a soft chime via the Web Audio API (respects the sound on/off
    setting; no external audio file).
  - If browser notification permission has been granted, fire a native
    notification (e.g. "Focus session complete — time for a break!").
  - Auto-advance to the next session type and reset the hourglass/clock to
    that session's full duration (timer does not auto-start; user presses
    Play to begin the next session).
- The browser tab title live-updates with the remaining time and session
  type, e.g. `24:53 — Focus`.

## Browser Notifications

- Notification permission is requested once, on first user interaction
  (e.g. the first time Play is pressed), not on page load.
- If granted: fire a notification on every session transition.
- If denied or the Notification API is unavailable: fall back silently to
  the in-page chime and visual state change only. No errors surfaced to the
  user.

## Responsive Design

- Hourglass and clock sizing use `clamp()` / viewport-relative units so they
  scale fluidly rather than overflowing on small screens.
- Control buttons meet a minimum ~44px touch target on touch devices.
- Settings panel becomes a full-screen sheet below a defined breakpoint
  (phone-width viewports) instead of a centered dialog.
- Verified visually at phone (~375px), tablet, and desktop widths.

## Architecture

Plain static site, no framework, no build step, no dependencies:
- `index.html` — markup and inline SVG hourglass
- `styles.css` — layout, responsive rules, animations
- `script.js` — state machine (session type × running/paused), countdown
  logic, hourglass animation driver (via CSS custom properties), settings
  persistence (`localStorage`), Web Audio chime, Notification API integration,
  tab title updates
- `README.md` — what the app does, how to run it locally, and how to deploy
  it to Vercel

Deploys directly to Vercel as a static site (no `vercel.json` required beyond
defaults).

## Testing Approach

This is a small, purely client-side, visual application with no backend or
data layer — automated unit tests would add little value relative to manual
verification. Verification will be done by driving the running app in-browser:
- Start / pause / reset behavior
- A full Work → Short Break → Work cycle, and reaching a Long Break
- Settings changes persisting across a page reload
- Notification permission flow and firing on session end
- Responsive layout at phone / tablet / desktop widths
- Parity between local behavior and the deployed Vercel build
