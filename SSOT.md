# MindEase — Single Source of Truth (SSOT)

> **Status:** Authoritative. This document is the canonical specification for MindEase.
> When this file and any other artifact (`README.md`, source, tests) disagree, **this file wins** —
> fix the other artifact, not this one. Every module, function, constant, and UI behaviour in the
> repository MUST trace back to a clause here.
>
> Keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY** are used per RFC 2119.

---

## 0. Document Control

| Field | Value |
|---|---|
| Project | MindEase — Wellness Companion for Exam Aspirants |
| Challenge | PromptWars (Google for Developers · Build with AI) — *Mental Wellness Tracker* |
| Chosen vertical | Exam-aspirant mental wellness (NEET / JEE / CUET / CAT / GATE / UPSC) |
| Repository | https://github.com/AlbinVishwas/mindease (public, single branch) |
| Stack | Vanilla ES modules, no build step; `node --test`; optional Gemini API |
| This document | `SSOT.md` — update **first**, then bring code/README into conformance |

---

## 1. Problem Statement (verbatim, as given)

> **Challenge: Mental Wellness Tracker**
>
> Build a Generative AI-powered solution that helps students monitor and improve their mental
> well-being during high-stakes board exams and competitive entrance tests (e.g., NEET, JEE, CUET,
> CAT, GATE, UPSC).
>
> Students preparing for these milestones often face severe stress, burnout, and self-doubt. Create
> a simple, engaging tool that leverages GenAI to analyze open-ended daily journaling and mood logs,
> uncovering hidden stress triggers and emotional patterns that standard trackers miss.
>
> The solution should use conversational AI to provide hyper-personalized, contextual wellness
> support—such as real-time tailored coping strategies, adaptive mindfulness exercises, and
> motivational encouragement—safely acting as an empathetic, always-available digital companion
> throughout their academic journey.

### 1.1 Decomposed requirements (normative)

Each requirement below has an ID used throughout this document for traceability.

| ID | Requirement (derived from the statement) | Priority |
|---|---|---|
| **R1** | Help students **monitor** well-being via daily journaling + mood logs | MUST |
| **R2** | Use **GenAI to analyze open-ended journaling** for patterns standard trackers miss | MUST |
| **R3** | **Uncover hidden stress triggers** and emotional patterns | MUST |
| **R4** | Provide **tailored coping strategies** in response to context | MUST |
| **R5** | Provide **adaptive mindfulness exercises** | SHOULD |
| **R6** | Provide **motivational encouragement** | SHOULD |
| **R7** | Act **safely** — empathetic, non-harmful, escalates real crises to humans | MUST |
| **R8** | Be **simple and engaging** — low-friction, single-page, fast | MUST |
| **R9** | Be **always-available** — works offline / without dependence on a paid key | MUST |
| **R10** | Target the **exam-aspirant persona** specifically (not generic wellness) | MUST |

---

## 2. Submission Constraints (hard rules — non-negotiable)

These come from the challenge instructions. Violating any one risks the submission not being evaluated.

- **C1** — Repository MUST be **public**.
- **C2** — Repository MUST contain **exactly one branch**. No feature branches, no `gh-pages`.
- **C3** — Repository size MUST be **< 10 MB**. No committed `node_modules`, media blobs, or model files.
- **C4** — Maximum **3 submission attempts**. Treat `main`/`master` as always-submittable.
- **C5** — README MUST explain: chosen vertical, approach & logic, how it works, assumptions.
- **C6** — All work MUST be reachable from the single default branch's tip.

> **Operational rule:** every commit MUST leave the repo in a submittable state (tests pass, app loads).

---

## 3. Evaluation Rubric (drives prioritisation)

Final score = sum of all six parameters; **no category is ignored**. Weights below are the official
impact tiers and MUST govern where effort goes when time is constrained.

| Parameter | Impact | What it rewards | Where it lives in this repo |
|---|---|---|---|
| **Code Quality** | 🟢 High | Clean, readable, well-structured | Pure engine, JSDoc, single-responsibility modules |
| **Problem Statement Alignment** | 🟢 High | Targets core challenge, user needs, objectives | §1 traceability, persona-specific data |
| **Security** | 🟡 Medium | Safe practices, avoids common vulnerabilities | §8 — XSS escaping, key handling, no eval |
| **Efficiency** | 🟡 Medium | Optimal time & memory | §6 complexity budgets, single-pass aggregation |
| **Testing** | ⚪ Low | Easily testable & maintainable | §9 — `node:test` suite on pure engine |
| **Accessibility** | ⚪ Low | Usable for diverse users & environments | §10 — ARIA, contrast, reduced-motion, keyboard |

> **Strategy:** Code Quality and Problem Alignment carry the most weight — protect them first.
> Security and Efficiency are the tie-raisers. Testing and Accessibility are the last points that
> separate near-equal ranks; we pursue a perfect score, so none is skipped.

---

## 4. Scope

### 4.1 Goals (in scope)
- Single-page browser app: write a journal entry + pick a mood → receive triggers, coping, trend, summary.
- Deterministic **rule-based engine** that works with **zero** external dependencies (satisfies R9).
- Optional **Gemini AI layer** that *enhances* output: deeper pattern analysis + empathetic message.
- **Crisis safety** path that supersedes everything (R7).
- Persistent local history via `localStorage`.

### 4.2 Non-goals (explicitly out of scope)
- No backend, accounts, auth, or cloud sync.
- No clinical diagnosis, scoring, or medical claims.
- No third-party analytics/telemetry.
- No build tooling, bundler, or framework.
- No storage or transmission of the user's API key beyond the live page session.

---

## 5. Architecture & Module Boundaries

```
index.html ──► src/app.js ──► src/engine.js ──► data/wellness.js
                  │
                  └──► src/aiLayer.js ──► Gemini 1.5 Flash (optional, user key)
```

**Layering rule (MUST):** dependencies point downward only.

| Layer | File | MAY import | MUST NOT |
|---|---|---|---|
| Data | `data/wellness.js` | nothing | import any other module; contain logic |
| Engine | `src/engine.js` | `data/wellness.js` | touch the DOM, `window`, `localStorage`, network, or `Date.now` side effects beyond passed-in values |
| AI | `src/aiLayer.js` | nothing (self-contained `fetch`) | touch the DOM; throw on failure; log the key |
| UI/Controller | `src/app.js` | `engine.js`, `aiLayer.js`, `data/wellness.js` | contain business rules that belong in the engine |

> The **engine MUST be pure** (no I/O, deterministic given inputs). This is the foundation of both
> Testing (⚪) and Code Quality (🟢) scores.

---

## 6. Data Contract — `data/wellness.js`

This module is the single source of all domain content. All exports are named constants; no functions.

- **`MOOD_SCALE`** — array of 5 entries, each `{ value: 1..5, label: string, emoji: string }`. Ascending.
- **`TRIGGER_KEYWORDS`** — object keyed by the six canonical categories; each value is a lowercase
  keyword/phrase array:
  - `syllabus_overload`, `mock_performance`, `peer_comparison`, `sleep_disruption`,
    `family_pressure`, `backlog_anxiety`.
- **`COPING_STRATEGIES`** — object keyed by the **same six category keys**; each value is an array of
  short, actionable strategy strings (≥ 3 per category). Includes mindfulness exercises (R5) and
  motivational lines (R6).
- **`CRISIS_KEYWORDS`** — array of ~20 **multi-word** phrases indicating suicidal ideation / self-harm.
  Multi-word by design to minimise false positives (e.g. never match the bare word "sleep").
- **`HELPLINES`** — array of `{ name, number, description }`. MUST include **Tele-MANAS (14416)**,
  **iCall (9152987821)**, and emergency **112**. This is the *only* place helplines are defined.

**Invariants (MUST):** keys of `TRIGGER_KEYWORDS` and `COPING_STRATEGIES` are identical sets; all
keyword text is lowercase; no duplicate category keys.

---

## 7. Engine Contract — `src/engine.js`

All functions are **pure** and exported. Signatures are normative; tests assert against them.

| Function | Signature | Behaviour / invariants |
|---|---|---|
| `sanitizeInput` | `(raw: string) => string` | Trim; collapse nothing semantic; cap length (e.g. 5000 chars). Never returns non-string. |
| `detectCrisis` | `(text: string) => boolean` | Case-insensitive substring scan over `CRISIS_KEYWORDS`. Early-exit on first match. Empty/blank → `false`. |
| `extractTriggers` | `(text: string) => string[]` | Returns the subset of the six category keys whose keywords appear in `text`. Deterministic order = `TRIGGER_KEYWORDS` key order. No duplicates. |
| `computeMoodTrend` | `(entries: Entry[]) => 'rising' \| 'declining' \| 'stable' \| 'insufficient_data'` | Compares mean mood of most-recent half vs earlier half. `< 4` entries → `insufficient_data`. Pure; no `Date.now`. |
| `suggestCoping` | `(triggers: string[], trend: string) => Array<{category: string, strategies: string[]}>` | Returns one grouped entry per matched trigger (category + its strategies) so the UI can render labelled coping cards. When `trend === 'declining'`, escalate to 2 strategies/trigger; otherwise 1. Falls back to the first two categories when no triggers. Stable order. |
| `generateWeeklySummary` | `(entries: Entry[], now?: number) => Summary` | Aggregates entries within `now − 7 days`. `now` defaults to `Date.now()` but is **injectable** to keep the function pure/testable. Returns `{ totalEntries, averageMood, moodLabel, topTriggers, trend, narrative }`. |

**Type — `Entry` (canonical):**
```js
/** @typedef {{ text: string, mood: 1|2|3|4|5, triggers: string[], timestamp: number }} Entry */
```

**Complexity budgets (Efficiency 🟡):**
- `detectCrisis`, `extractTriggers`: O(n·k), n = text length, k = keyword count. No backtracking regex.
- `computeMoodTrend`, `generateWeeklySummary`: single pass over `entries`, O(m).

---

## 8. AI Layer Contract — `src/aiLayer.js`

Optional enhancement layer (R2). The app MUST be fully functional when this layer is absent or fails.

| Function | Signature | Contract |
|---|---|---|
| `analyzePatterns` | `(entries: Entry[], apiKey: string) => Promise<string \| null>` | Builds an **anonymised** summary internally from the last 10 entries (mood values, dates, trigger categories) — **never reads or sends `entry.text`**. Returns insight text or `null` on any error. |
| `generateEmpathyResponse` | `(mood: number, triggers: string[], apiKey: string) => Promise<string \| null>` | Returns a short empathetic, motivational message (R6) built **only** from the mood rating and anonymised trigger categories — **never the raw journal text**. Returns `null` on error. |

**Rules (MUST):**
- Model: **Gemini 1.5 Flash**. Key is **user-provided at runtime**; never embedded, never persisted, never logged.
- Functions **never throw** — all failures resolve to `null` (graceful degradation → R9).
- Called **only after** synchronous engine results are already rendered, and **only if** `detectCrisis` is false.
- Run AI calls in parallel (`Promise.all`); they MUST NOT block first paint.

---

## 9. UI / Controller Contract — `src/app.js` + `index.html` + `styles.css`

### 9.1 Processing pipeline (ordered, normative)
1. Read journal text + mood.
2. `sanitizeInput()`.
3. **`detectCrisis()` first, always.** If `true` → render crisis panel (§11), persist entry, **stop**. No AI.
4. `extractTriggers()`.
5. `computeMoodTrend()` over stored history.
6. `suggestCoping(triggers, trend)`.
7. `generateWeeklySummary(history, Date.now())`.
8. Render — **all user-derived text MUST pass `escapeHtml()` before DOM insertion**.
9. If a key is present and not in crisis: call AI layer in parallel; render into an `aria-live` region.
10. Persist entry to `localStorage` (bounded to most recent **100** entries).

### 9.2 Persistence
- Key: a single namespaced `localStorage` key holding a JSON array of `Entry`.
- All reads/writes wrapped in `try/catch`; storage failure MUST degrade silently, not crash.

---

## 10. Safety, Security & Privacy (R7 + Security 🟡)

- **S1 — Crisis supersedes all.** On `detectCrisis() === true`: show warm, non-judgmental panel ("You're not
  alone."), surface `HELPLINES` prominently incl. 112, **skip the AI call entirely**, still save the entry.
- **S2 — Helplines always visible.** Rendered from `HELPLINES` in the footer on every session, not only on crisis.
- **S3 — XSS-safe rendering.** Every piece of user/AI text is escaped via `escapeHtml()` before insertion. No `innerHTML` with raw content; no `eval`, no `new Function`.
- **S4 — Key hygiene.** API key lives only in runtime memory for the session; never stored, never logged, never committed. `.env.example` documents the variable name only.
- **S5 — Data minimisation.** No raw journal text leaves the device; AI receives anonymised summaries only.
- **S6 — No telemetry.** Zero third-party tracking or network calls except the optional Gemini request.
- **S7 — Honest limitations.** UI states this is not a clinical tool and cannot replace a counsellor.

---

## 11. Accessibility Requirements (Accessibility ⚪)

- **A1** — Semantic landmarks (`header`/`main`/`footer`), a skip link, and logical heading order.
- **A2** — All interactive controls keyboard-reachable with visible `:focus-visible` rings.
- **A3** — AI output and dynamic results live in an `aria-live="polite"` region; crisis panel uses `role="alert"`.
- **A4** — Mood bars/charts carry text `aria-label`s; colour is never the sole signal.
- **A5** — Respect `prefers-reduced-motion`: all non-essential animation disabled.
- **A6** — WCAG AA contrast on the dark theme.

---

## 12. Testing Requirements (Testing ⚪)

- **T1** — Suite runs via `node --test` (`npm test`); **no test dependencies** beyond Node's built-in runner.
- **T2** — Only the **pure engine** is unit-tested (DOM/AI excluded by design — keeps tests fast & deterministic).
- **T3** — Coverage MUST include, per function: happy path, empty/blank input, boundary (e.g. `insufficient_data`).
- **T4** — `detectCrisis` MUST have explicit **true-positive** and **false-positive** cases (e.g. "I want to sleep" → `false`).
- **T5** — `extractTriggers` MUST assert deterministic ordering and de-duplication.
- **T6** — Target ≥ 40 assertions across the six engine functions.

---

## 13. Requirement → Implementation Traceability

| Req | Satisfied by | Verified by |
|---|---|---|
| R1 monitor (journal+mood) | `app.js` input flow, `localStorage` history | manual + persistence path |
| R2 GenAI analysis | `aiLayer.analyzePatterns` | graceful-degradation manual check |
| R3 hidden triggers | `engine.extractTriggers` + `TRIGGER_KEYWORDS` | T5 |
| R4 tailored coping | `engine.suggestCoping` + `COPING_STRATEGIES` | engine tests |
| R5 mindfulness | mindfulness entries in `COPING_STRATEGIES` | data invariant §6 |
| R6 motivation | `aiLayer.generateEmpathyResponse` + coping lines | manual |
| R7 safety | `engine.detectCrisis` + §10 S1/S2 | T4 |
| R8 simple/engaging | single-page `index.html`, no build | app loads |
| R9 always-available | engine works with no key; AI returns `null` on fail | T1–T6 offline |
| R10 persona | exam-specific `TRIGGER_KEYWORDS` + India helplines | data review |

---

## 14. Definition of Done

A change is **done** only when all hold:
- [ ] Conforms to the contracts in §6–§11 (or this SSOT was updated first and deliberately).
- [ ] `npm test` passes with no failures.
- [ ] App loads via `npm start` and a journal entry produces triggers + coping + summary with **no key**.
- [ ] Crisis path verified: a crisis phrase shows the panel and makes **no** AI call.
- [ ] No secrets, `node_modules`, or large binaries committed (C3); single branch (C2); repo public (C1).
- [ ] README's four required sections (C5) remain accurate against this SSOT.

---

*If you or someone you know is struggling, call **Tele-MANAS 14416** — free, 24/7, confidential.*
