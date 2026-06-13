# Oasis — an AI-native wellness companion for exam aspirants

> **Challenge:** PromptWars · *Mental Wellness Tracker* (Google for Developers · Build with AI)
>
> Oasis is a **Generative-AI–powered** journal for Indian students preparing for high-stakes exams
> (NEET, JEE, CUET, CAT, GATE, UPSC). You write freely about your prep; **Gemini reads the entry and
> surfaces the hidden emotional patterns a standard mood tracker misses**, then responds like a calm,
> always-available study companion — with a conversational reflection, **adaptive mindfulness**, and
> **motivational encouragement**. A deterministic on-device engine runs underneath as a safety net so
> the app is useful even offline, and crisis language always routes to real human helplines first.

**Live demo:** https://oasis-sandy.vercel.app · Click **“Load a sample week”** to see the full
experience instantly (no key needed).

---

## Chosen vertical

**Exam-aspirant mental wellness.** Students in long, high-pressure preparations face sustained stress,
burnout, and self-doubt with specific, recurring stressors — syllabus overload, mock-test performance,
peer comparison, sleep disruption, family pressure, and revision backlog. Oasis is designed around this
persona end to end: the prompts, the detected themes, the coping content, and the helplines are all
India- and aspirant-specific.

---

## Why this is AI-native (not a tracker with AI bolted on)

The challenge asks for a solution that **“leverages GenAI to analyze open-ended daily journaling …
uncovering hidden stress triggers and emotional patterns that standard trackers miss.”** A keyword
tracker *is* the “standard tracker.” So Generative AI is the **primary analysis path** in Oasis:

| Layer | Role |
|---|---|
| **Gemini 1.5 Flash** (`analyzeJournal`) | **Primary.** Reads the raw, open-ended entry and returns a structured reflection: hidden emotional patterns, a conversational empathetic response, and one gentle next step. This is the capability the challenge is about. |
| **On-device engine** (`engine.js`) | **Safety net + offline.** Deterministic analysis (triggers, trend, coping, adaptive mindfulness, encouragement, weekly summary) so the app still delivers value with no key or no network, and so crisis detection never depends on a third party. |

The conversational, contextual support the brief asks for — **real-time coping strategies, adaptive
mindfulness exercises, and motivational encouragement** — are all first-class, visible features.

---

## How it works (per check-in)

```
index.html ─► app.js ─► engine.js ─► data/wellness.js        (always: on-device)
                 │
                 └─► aiLayer.js ─► Gemini 1.5 Flash           (when a key is provided)
                       analyzeJournal()  ← reads the entry (with consent)
                       generateEmpathyResponse() / analyzePatterns()  ← anonymised mode
```

1. **Write + mood.** Free-text entry plus a 1–5 mood.
2. **Sanitize.** Trim and length-cap the input.
3. **Crisis check — always first.** If the entry contains crisis language, Oasis immediately shows
   warm, non-judgmental support with helplines (Tele-MANAS 14416, iCall, 112) and **makes no AI call**.
4. **On-device analysis (instant).** Trigger extraction, mood trend, coping strategies, an **adaptive
   mindfulness exercise** chosen for the mood/trigger, and a **motivational encouragement** for the trend.
5. **Generative-AI reflection (headline).** With a Gemini key, `analyzeJournal` reads the entry and
   returns the conversational reflection + **hidden patterns** + a next step. It renders into an
   `aria-live` region so it’s announced to screen readers.
6. **Persist + summarise.** The entry is saved locally (most-recent 100) and a 7-day summary updates.

---

## Privacy & responsible AI

- **No backend, no accounts, no analytics.** All storage is `localStorage` on your device.
- **Your key, your call.** The Gemini key is provided by you at runtime and is never stored or logged.
- **Consent-gated reading.** A clear checkbox controls whether the AI reads your full entry. Unchecked,
  only your mood and **anonymised** trigger categories are sent — never the words you wrote.
- **Crisis is never sent to an LLM.** Crisis language short-circuits to human helplines.
- **Graceful degradation.** Every AI call is best-effort; on any failure the on-device insights stand
  on their own. The app is fully functional with no key.
- **Honest limitations.** Oasis is a supportive companion, not a clinical tool, and says so.

---

## Problem statement → implementation

| Requirement (from the brief) | How Oasis meets it | Where |
|---|---|---|
| GenAI analyses **open-ended journaling** | `analyzeJournal` reads the raw entry via Gemini | `src/aiLayer.js` |
| Uncover **hidden stress triggers / patterns** a tracker misses | AI returns `hiddenPatterns[]`; engine extracts explicit triggers | `aiLayer.js`, `engine.js` |
| **Real-time tailored coping strategies** | `suggestCoping` (escalates when mood declines) | `engine.js` |
| **Adaptive mindfulness exercises** | `suggestMindfulness` picks an exercise by mood + trigger | `engine.js`, `data/wellness.js` |
| **Motivational encouragement** | `pickEncouragement` + AI reflection | `engine.js`, `aiLayer.js` |
| **Empathetic, always-available companion** | Conversational reflection; works offline via engine | `aiLayer.js`, `app.js` |
| **Safe** | Crisis-first gating, always-visible helplines, no LLM on crisis | `engine.js`, `app.js` |
| **Simple & engaging** | One page, no build step, “Load sample week” demo | `index.html` |

---

## Quality notes (for reviewers)

- **Code quality.** Strict layering (`data → engine → ai/ui`); the engine is **pure** (no DOM, network,
  storage, or wall-clock beyond an injected `now`); every function is JSDoc-documented; all user/AI text
  is HTML-escaped before rendering.
- **Testing.** `npm test` runs a `node --test` suite of **59 unit tests** over the pure engine, including
  crisis true/false-positive cases, trigger de-duplication, trend boundaries, adaptive-mindfulness
  selection, and a purity test proving the weekly window is relative to an injected `now`.
- **Efficiency.** Keyword scans are O(n·k) with no backtracking regex; aggregations are single-pass; AI
  calls run after first paint and never block the UI.
- **Accessibility.** Semantic landmarks, a skip link, `:focus-visible` rings, `aria-live` regions, a
  `role="alert"` crisis panel, labelled controls, WCAG-AA contrast, and full `prefers-reduced-motion`
  support.

---

## Run locally

```bash
npm start        # serves at http://localhost:8000 (no build step)
npm test         # runs the node:test suite
```

To enable the Generative-AI reflection, get a free key from
[Google AI Studio](https://aistudio.google.com/app/apikey) and paste it into the app’s
“Optional: Add Gemini AI key” panel. No key is ever shipped with the app (see `.env.example`).

---

## Assumptions

1. Target user is an Indian competitive-exam aspirant; stressor language and helplines are India-specific.
2. “Crisis” means language suggesting suicidal ideation or self-harm — kept precise to avoid false positives.
3. `localStorage` is sufficient for an MVP; no account or sync is needed.
4. The Gemini key is user-owned; the app never embeds one.
5. A five-point mood scale is the simplest validated self-report format for this context.

---

*If you or someone you know is struggling, call **Tele-MANAS 14416** — free, 24/7, confidential.*
