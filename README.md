# MindEase — Wellness Companion for Exam Aspirants

> A lightweight, privacy-first mental wellness journal built for Indian competitive exam aspirants (UPSC, JEE, NEET, CAT, and similar). Pairs a deterministic rule-based engine with an optional Gemini AI layer to surface personalised mental-wellness guidance — entirely in the browser.

---

## Chosen Vertical

**Exam-aspirant mental wellness** — a population under chronic, sustained stress with specific, identifiable stressors (syllabus overload, mock test performance, peer comparison, sleep disruption, family pressure, and backlog anxiety). These stressors are highly predictable in language, which makes a keyword-based trigger engine both practical and effective.

---

## How the Solution Works

### Architecture Overview

```
index.html  ──►  src/app.js  ──►  src/engine.js  ──►  data/wellness.js
                    │
                    └──►  src/aiLayer.js  ──►  Gemini 1.5 Flash API
                                               (optional, user-provided key)
```

### Processing Pipeline (per journal entry)

1. **Input** — User writes a free-text journal entry and selects a mood rating (1–5).
2. **Sanitize** — `sanitizeInput()` trims and length-limits the raw text.
3. **Crisis detection (first, always)** — `detectCrisis()` scans for CRISIS_KEYWORDS. If flagged, the app immediately renders the crisis UI with helplines and stops further processing. No AI call is made.
4. **Trigger extraction** — `extractTriggers()` matches journal text against six stress-category keyword lists and returns matched categories.
5. **Mood trend** — `computeMoodTrend()` compares the average mood of the most recent half of entries to the earlier half to produce a `rising | declining | stable | insufficient_data` label.
6. **Coping suggestions** — `suggestCoping()` selects strategies from `COPING_STRATEGIES` based on matched triggers. When the trend is `declining`, it escalates to 2 strategies per trigger.
7. **Weekly summary** — `generateWeeklySummary()` aggregates all entries from the past 7 days into counts, averages, top triggers, and a plain-language narrative.
8. **Render** — `app.js` HTML-escapes all user content before injecting into the DOM, then renders results into the page.
9. **AI enhancement (optional)** — If the user provided a Gemini API key, `analyzePatterns()` and `generateEmpathyResponse()` are called in parallel after synchronous results are already visible. Results appear in an `aria-live` region so screen readers announce them.
10. **Persist** — The entry is saved to `localStorage` (trimmed to the most recent 100 entries).

### Data Flow and Privacy

- **No server.** All processing is local.
- **No API key storage.** The key lives only in the JavaScript runtime for the current page session.
- **No raw journal text sent to AI.** Only anonymised pattern summaries (mood, date, trigger categories) are included in Gemini prompts for pattern analysis.
- **AI is purely additive.** All core insights (triggers, coping, summary) are available without an API key.

---

## Assumptions Made

1. The target user is an Indian competitive exam aspirant; stressor language and helplines are India-specific.
2. "Crisis" means language suggesting suicidal ideation or self-harm — not general distress. Thresholds are intentionally precise to minimise false positives.
3. `localStorage` is a sufficient persistence layer for an MVP; no account or sync is needed.
4. The Gemini API key is user-owned (not provided by the app); the app never ships with an embedded key.
5. A five-point mood scale (1–5) is the simplest validated self-report format appropriate for this context.
6. The app is a single-page, no-build-step web application served via a simple HTTP server.

---

## Feature-to-Criteria Mapping

| Feature | Code Quality | Security | Efficiency | Testing | Accessibility | Problem Alignment |
|---|---|---|---|---|---|---|
| **Pure engine functions** (`engine.js`) | ✅ JSDoc, single-responsibility, no side effects | ✅ No DOM access, no I/O | ✅ O(n·k) keyword scan, no regex catastrophe | ✅ 40+ unit tests | — | ✅ Directly models aspirant stress patterns |
| **HTML escaping in `app.js`** | ✅ `escapeHtml()` utility, applied consistently | ✅ Prevents XSS from user journal text | ✅ String replace, O(n) | — | — | ✅ Safe rendering of sensitive personal entries |
| **Crisis detection gating** | ✅ Runs first, blocks AI path | ✅ No AI call on crisis text | ✅ Early-exit on first match | ✅ 8 crisis tests (true/false positive) | ✅ Screen reader `role="alert"` | ✅ Core safety requirement |
| **AI graceful degradation** | ✅ `try/catch`, null returns, no throws | ✅ Key never logged/stored | ✅ Parallel `Promise.all`, non-blocking | — | ✅ `aria-live` region announces AI text | ✅ Works fully without a key |
| **Semantic HTML + ARIA** (`index.html`) | ✅ Semantic landmarks, skip link | — | — | — | ✅ `aria-live`, `aria-label`, `focus-visible` | ✅ Inclusive design for all users |
| **`localStorage` persistence** | ✅ Try/catch, bounded to 100 entries | ✅ Only app data, no raw key stored | ✅ JSON serialisation, trimmed on write | — | — | ✅ Continuity across sessions |
| **Mood trend + weekly summary** | ✅ Modular, composable, JSDoc'd | — | ✅ Iterates entries once each | ✅ Covered in test suite | ✅ Rendered as `aria-label`-annotated bars | ✅ Longitudinal self-awareness |
| **Always-visible helplines** | ✅ Rendered from data constant, never conditional | — | — | — | ✅ `tel:` links, readable contrast | ✅ Non-negotiable safety feature |
| **`prefers-reduced-motion`** | ✅ CSS media query disables all animations | — | — | — | ✅ Full compliance | ✅ Inclusive for motion-sensitive users |
| **`focus-visible` rings** | ✅ CSS `outline: 3px solid var(--accent-green)` | — | — | — | ✅ Keyboard navigability | ✅ WCAG 2.4.7 compliance |

---

## Safety & Responsibility

### Crisis Detection Design

**Philosophy:** The crisis detector exists to surface human support resources *immediately*, without shame or alarm — not to diagnose, score, or gate access to the app.

**How it works:**
- `CRISIS_KEYWORDS` is a curated list of 20 phrases associated with suicidal ideation or self-harm.
- Detection is a case-insensitive substring scan — deliberately simple and fast.
- On a match, the app:
  1. Shows a warm, non-judgmental crisis panel with the message *"You're not alone."*
  2. Displays Tele-MANAS (14416) and iCall (9152987821) with descriptions.
  3. Includes the emergency number 112.
  4. **Skips the AI call entirely** — a language model is not an appropriate responder to crisis language.
  5. Still saves the entry locally so the user's record is preserved.

**False-positive minimisation:**
- Keywords are phrases (multi-word), not single words, to avoid matching "I want to sleep" as a crisis.
- The test suite explicitly covers at least 3 neutral false-positive cases.
- The bar for crisis detection is intentionally *high enough* to be meaningful, *low enough* to never miss a clear signal.

**Limitations and honest caveats:**
- This is not a clinical tool. No keyword list can substitute for a trained counsellor.
- The app displays helplines to *all* users at the bottom of every page — not just those who trigger the crisis detector — so support is always discoverable.
- Users in acute crisis should be directed to 112 (emergency services), which is noted in the crisis panel.

### Helpline Integration

Helplines are:
- Rendered from a `HELPLINES` data constant — never hardcoded inline in HTML (single source of truth).
- Displayed unconditionally in the page footer on every session.
- Shown with enhanced prominence in the crisis panel.
- Implemented as `tel:` links so they are one tap away on mobile.

---

## Running Locally

```bash
# Serve the app (no build step needed)
npm start
# → open http://localhost:8000

# Run tests
npm test
```

The app requires a browser that supports ES modules (`type="module"`). No bundler or build step is required.

---

## Project Structure

```
.
├── data/
│   └── wellness.js          # MOOD_SCALE, TRIGGER_KEYWORDS, COPING_STRATEGIES,
│                            # CRISIS_KEYWORDS, HELPLINES
├── src/
│   ├── engine.js            # Pure functions: extractTriggers, detectCrisis,
│   │                        # computeMoodTrend, suggestCoping, generateWeeklySummary,
│   │                        # sanitizeInput
│   ├── aiLayer.js           # analyzePatterns, generateEmpathyResponse (Gemini 1.5 Flash)
│   └── app.js               # DOM controller, event handlers, rendering
├── tests/
│   └── engine.test.js       # node:test suite (40+ tests)
├── index.html               # Semantic HTML, ARIA landmarks, skip link
├── styles.css               # Dark calm theme, responsive, prefers-reduced-motion
└── README.md
```

---

*Built with care. If you or someone you know is struggling, please call Tele-MANAS at **14416** — free, 24/7, confidential.*
