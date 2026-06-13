/**
 * @fileoverview DOM controller for the Oasis wellness companion.
 *
 * Orchestrates the per-entry pipeline: sanitize → crisis check (always first) →
 * deterministic engine analysis (works fully offline) → optional Generative-AI
 * enhancement → render → persist. Every piece of user- or model-generated text is
 * HTML-escaped before it touches the DOM, and crisis detection gates all AI calls.
 */

import {
  sanitizeInput,
  extractTriggers,
  computeMoodTrend,
  detectCrisis,
  suggestCoping,
  suggestMindfulness,
  pickEncouragement,
  generateWeeklySummary,
} from './engine.js';
import { analyzeJournal, analyzePatterns, generateEmpathyResponse } from './aiLayer.js';
import { HELPLINES, MOOD_SCALE, SAMPLE_ENTRIES } from '../data/wellness.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mindease_entries'; // kept stable so existing users keep their history
const MAX_ENTRIES = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Utility: HTML Escaping ────────────────────────────────────────────────────

/**
 * Escapes a string so it is safe to inject into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Formats a category name for display (replaces underscores with spaces, title-cases).
 * @param {string} cat
 * @returns {string}
 */
function formatCategory(cat) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Returns the descriptive label for a mood value (1-5) from MOOD_SCALE.
 * @param {number|string} value
 * @returns {string}
 */
function moodLabelFor(value) {
  const entry = MOOD_SCALE.find((m) => m.value === Number(value));
  return entry ? entry.label : String(value);
}

// ─── Persistence ──────────────────────────────────────────────────────────────

/**
 * Loads all entries from localStorage. Returns [] on any parse error.
 * @returns {Array}
 */
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves entries to localStorage. Silently fails if storage is unavailable.
 * Trims to MAX_ENTRIES (oldest removed first).
 * @param {Array} entries
 */
function saveEntries(entries) {
  try {
    const trimmed = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage quota exceeded or unavailable — continue without persistence
  }
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

/**
 * Sets content of an aria-live region safely.
 * @param {HTMLElement} el
 * @param {string} html - Already-escaped or trusted HTML
 */
function setLive(el, html) {
  if (!el) return;
  el.innerHTML = html;
}

/**
 * Shows an element by removing the 'hidden' class.
 * @param {HTMLElement} el
 */
function show(el) {
  if (el) el.classList.remove('hidden');
}

/**
 * Hides an element by adding the 'hidden' class.
 * @param {HTMLElement} el
 */
function hide(el) {
  if (el) el.classList.add('hidden');
}

// ─── Render: Crisis UI ────────────────────────────────────────────────────────

/**
 * Renders the crisis support panel with helplines.
 * @param {HTMLElement} container
 */
function renderCrisisUI(container) {
  const lines = HELPLINES.map(
    (h) =>
      `<li class="helpline-item crisis-helpline">
        <span class="helpline-name">${escapeHtml(h.name)}</span>
        <a href="tel:${escapeHtml(h.number)}" class="helpline-number" aria-label="Call ${escapeHtml(h.name)} at ${escapeHtml(h.number)}">${escapeHtml(h.number)}</a>
        <p class="helpline-desc">${escapeHtml(h.description)}</p>
      </li>`
  ).join('');

  container.innerHTML = `
    <div class="crisis-panel" role="alert" aria-live="assertive">
      <div class="crisis-icon" aria-hidden="true">🌿</div>
      <h2 class="crisis-title">You're not alone</h2>
      <p class="crisis-message">
        It sounds like you're going through something really hard right now.
        What you're feeling is valid, and you deserve support.
        Please reach out to one of these confidential helplines — they're here for you.
      </p>
      <ul class="helplines-list" aria-label="Crisis helplines">
        ${lines}
      </ul>
      <p class="crisis-footer">
        If you're in immediate danger, please call <strong>112</strong> (emergency services).
      </p>
    </div>
  `;
}

// ─── Render: Mood Trend ───────────────────────────────────────────────────────

/**
 * Renders mood trend section.
 * @param {HTMLElement} container
 * @param {string} trend
 * @param {Array} entries
 */
function renderMoodTrend(container, trend, entries) {
  const trendConfig = {
    rising:             { icon: '📈', label: 'Rising',             cls: 'trend-rising' },
    declining:          { icon: '📉', label: 'Declining',          cls: 'trend-declining' },
    stable:             { icon: '➡️',  label: 'Stable',             cls: 'trend-stable' },
    insufficient_data:  { icon: '📊', label: 'Not enough data yet', cls: 'trend-neutral' },
  };
  const cfg = trendConfig[trend] || trendConfig.insufficient_data;

  // Build spark-line dots (last 7 entries)
  const recentEntries = entries.slice(-7);
  const dots = recentEntries.map((e) => {
    const pct = ((e.mood - 1) / 4) * 100;
    const label = moodLabelFor(e.mood);
    return `<div class="sparkdot" style="--pct:${pct}%" title="${escapeHtml(label)}" aria-label="Mood: ${escapeHtml(label)}"></div>`;
  }).join('');

  container.innerHTML = `
    <div class="trend-card ${escapeHtml(cfg.cls)}">
      <div class="trend-header">
        <span class="trend-icon" aria-hidden="true">${cfg.icon}</span>
        <span class="trend-label">Mood trend: <strong>${escapeHtml(cfg.label)}</strong></span>
      </div>
      ${recentEntries.length > 0 ? `<div class="sparkline" aria-label="Recent mood history">${dots}</div>` : ''}
    </div>
  `;
}

// ─── Render: Trigger Breakdown ────────────────────────────────────────────────

/**
 * Renders the trigger breakdown for the current entry.
 * @param {HTMLElement} container
 * @param {string[]} triggers
 */
function renderTriggers(container, triggers) {
  if (!triggers || triggers.length === 0) {
    container.innerHTML = `<p class="no-triggers">No specific stress triggers detected in this entry. 🌱</p>`;
    return;
  }

  const tags = triggers.map(
    (t) => `<span class="trigger-tag" data-category="${escapeHtml(t)}">${escapeHtml(formatCategory(t))}</span>`
  ).join('');

  container.innerHTML = `
    <div class="trigger-breakdown">
      <p class="trigger-label">Stress signals detected:</p>
      <div class="trigger-tags" role="list" aria-label="Detected stress triggers">
        ${tags}
      </div>
    </div>
  `;
}

// ─── Render: Coping Suggestions ───────────────────────────────────────────────

/**
 * Renders coping strategy cards.
 * @param {HTMLElement} container
 * @param {Array.<{category: string, strategies: string[]}>} suggestions
 * @param {boolean} isEscalated - Whether mood is declining (show escalation notice)
 */
function renderCoping(container, suggestions, isEscalated) {
  if (!suggestions || suggestions.length === 0) {
    container.innerHTML = `<p class="no-suggestions">Keep journalling to receive personalised coping suggestions.</p>`;
    return;
  }

  const escalationNotice = isEscalated
    ? `<p class="escalation-notice">💙 Your mood has been declining — here are some extra strategies to help:</p>`
    : '';

  const cards = suggestions.map(({ category, strategies }) => {
    const items = strategies.map(
      (s) => `<li class="strategy-item">${escapeHtml(s)}</li>`
    ).join('');

    return `
      <div class="coping-card" data-category="${escapeHtml(category)}">
        <h3 class="coping-card-title">${escapeHtml(formatCategory(category))}</h3>
        <ul class="strategy-list">${items}</ul>
      </div>
    `;
  }).join('');

  container.innerHTML = `${escalationNotice}<div class="coping-grid">${cards}</div>`;
}

// ─── Render: Adaptive Mindfulness ─────────────────────────────────────────────

/**
 * Renders the adaptive mindfulness exercise chosen for this entry.
 * @param {HTMLElement} container
 * @param {{name: string, durationMin: number, steps: string[]}} exercise
 */
function renderMindfulness(container, exercise) {
  if (!exercise) {
    container.innerHTML = '';
    return;
  }
  const steps = exercise.steps
    .map((s) => `<li class="mindful-step">${escapeHtml(s)}</li>`)
    .join('');

  container.innerHTML = `
    <div class="mindful-card">
      <div class="mindful-head">
        <span class="mindful-name">${escapeHtml(exercise.name)}</span>
        <span class="mindful-time">${escapeHtml(String(exercise.durationMin))} min</span>
      </div>
      <ol class="mindful-steps">${steps}</ol>
    </div>
  `;
}

// ─── Render: Motivational Encouragement ───────────────────────────────────────

/**
 * Renders a single motivational encouragement line.
 * @param {HTMLElement} container
 * @param {string} message
 */
function renderEncouragement(container, message) {
  if (!message) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <p class="encouragement" role="note">
      <span class="encouragement-icon" aria-hidden="true">🌱</span>${escapeHtml(message)}
    </p>
  `;
}

// ─── Render: GenAI Reflection (headline) ──────────────────────────────────────

/**
 * Renders the Generative-AI reflection: a conversational reflection plus the
 * hidden emotional patterns the model surfaced from the raw entry.
 * @param {HTMLElement} container
 * @param {{reflection: string, hiddenPatterns: string[], deeperInsight: string}} ai
 */
function renderAIReflection(container, ai) {
  if (!ai || !ai.reflection) {
    container.innerHTML = `<p class="ai-unavailable">AI reflection unavailable — your insights above come from the on-device engine.</p>`;
    return;
  }

  const patterns = Array.isArray(ai.hiddenPatterns) && ai.hiddenPatterns.length > 0
    ? `<div class="ai-patterns" aria-label="Hidden patterns surfaced by AI">
         <p class="ai-patterns-label">Patterns a simple tracker might miss</p>
         <ul class="ai-pattern-list">${ai.hiddenPatterns
           .map((p) => `<li class="ai-pattern">${escapeHtml(p)}</li>`)
           .join('')}</ul>
       </div>`
    : '';

  const deeper = ai.deeperInsight
    ? `<p class="ai-deeper"><strong>A gentle next step:</strong> ${escapeHtml(ai.deeperInsight)}</p>`
    : '';

  container.innerHTML = `
    <div class="ai-response ai-reflection">
      <p class="ai-label">✨ AI Reflection</p>
      <p class="ai-text">${escapeHtml(ai.reflection)}</p>
      ${deeper}
      ${patterns}
    </div>
  `;
}

// ─── Render: Weekly Summary ───────────────────────────────────────────────────

/**
 * Renders the weekly summary section.
 * @param {HTMLElement} container
 * @param {object} summary
 */
function renderWeeklySummary(container, summary) {
  const moodBar = summary.averageMood !== null
    ? `<div class="mood-bar-wrap" aria-label="Average mood: ${summary.averageMood} out of 5">
        <div class="mood-bar" style="width:${(summary.averageMood / 5) * 100}%" role="img" aria-hidden="true"></div>
        <span class="mood-bar-label">${summary.averageMood}/5 — ${escapeHtml(summary.moodLabel || '')}</span>
       </div>`
    : '';

  const topTriggersList = summary.topTriggers.length > 0
    ? `<p class="summary-triggers">Top stressors: ${summary.topTriggers.map((t) => `<span class="trigger-tag small">${escapeHtml(formatCategory(t))}</span>`).join(' ')}</p>`
    : '';

  container.innerHTML = `
    <div class="summary-card">
      <p class="summary-narrative">${escapeHtml(summary.narrative)}</p>
      ${moodBar}
      ${topTriggersList}
    </div>
  `;
}

// ─── Render: Entry History ────────────────────────────────────────────────────

/**
 * Renders a compact list of the most recent journal entries.
 * @param {HTMLElement} container
 * @param {Array} entries
 */
function renderHistory(container, entries) {
  if (!entries || entries.length === 0) {
    container.innerHTML = `<p class="no-history">Your journal entries will appear here.</p>`;
    return;
  }

  const recent = entries.slice(-5).reverse();
  const items = recent.map((e) => {
    const date = new Date(e.timestamp).toLocaleString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const moodLabel = moodLabelFor(e.mood);
    const preview = escapeHtml(e.text.slice(0, 120)) + (e.text.length > 120 ? '…' : '');
    const triggerList = Array.isArray(e.triggers) && e.triggers.length > 0
      ? e.triggers.map((t) => `<span class="trigger-tag tiny">${escapeHtml(formatCategory(t))}</span>`).join(' ')
      : '';

    return `
      <article class="history-item" aria-label="Journal entry from ${escapeHtml(date)}">
        <div class="history-meta">
          <time datetime="${new Date(e.timestamp).toISOString()}" class="history-date">${escapeHtml(date)}</time>
          <span class="history-mood mood-${e.mood}" aria-label="Mood: ${escapeHtml(moodLabel)}">${escapeHtml(moodLabel)}</span>
        </div>
        <p class="history-preview">${preview}</p>
        ${triggerList ? `<div class="history-triggers">${triggerList}</div>` : ''}
      </article>
    `;
  }).join('');

  container.innerHTML = items;
}

// ─── Helplines (always visible) ───────────────────────────────────────────────

/**
 * Renders the always-visible helplines section in the footer area.
 * @param {HTMLElement} container
 */
function renderHelplines(container) {
  const items = HELPLINES.map(
    (h) =>
      `<li class="helpline-item">
        <div class="helpline-info">
          <span class="helpline-name">${escapeHtml(h.name)}</span>
          <a href="tel:${escapeHtml(h.number)}" class="helpline-number" aria-label="Call ${escapeHtml(h.name)}">${escapeHtml(h.number)}</a>
        </div>
        <p class="helpline-desc">${escapeHtml(h.description)}</p>
      </li>`
  ).join('');

  container.innerHTML = `
    <ul class="helplines-list" aria-label="Mental health helplines">
      ${items}
    </ul>
  `;
}

// ─── Mood Slider Label ────────────────────────────────────────────────────────

/**
 * Updates the live mood label when the slider changes.
 * @param {HTMLInputElement} slider
 * @param {HTMLElement} label
 */
function updateMoodLabel(slider, label) {
  const val = parseInt(slider.value, 10);
  label.textContent = `${val} — ${moodLabelFor(val)}`;
}

// ─── Submit Handler ───────────────────────────────────────────────────────────

/**
 * Main journal submission handler.
 * Flow: sanitize → crisis check → engine analysis → (optional) AI → render → persist.
 *
 * @param {object} els - DOM element references
 * @param {Array} entries - Mutable entries array (will be modified in place)
 */
async function handleSubmit(els, entries) {
  const rawText = els.journalTextarea.value;
  const rawMood = parseInt(els.moodSlider.value, 10);
  const rawKey  = els.apiKeyInput ? els.apiKeyInput.value : '';

  // 1. Sanitize inputs
  const text   = sanitizeInput(rawText);
  const mood   = isNaN(rawMood) ? 3 : Math.min(5, Math.max(1, rawMood));
  const apiKey = sanitizeInput(rawKey, 200); // key sanitized but never stored/logged

  if (!text) {
    els.journalTextarea.focus();
    els.journalTextarea.setAttribute('aria-invalid', 'true');
    return;
  }
  els.journalTextarea.setAttribute('aria-invalid', 'false');

  // Show loading state
  els.submitBtn.disabled = true;
  els.submitBtn.textContent = 'Analysing…';
  hide(els.resultsSection);

  // 2. Crisis detection FIRST — gates all further processing
  const crisis = detectCrisis(text);

  if (crisis) {
    renderCrisisUI(els.crisisContainer);
    show(els.crisisSection);
    hide(els.insightsSection);
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = 'Save Entry';
    // Still save the entry so the user isn't left with no record
    const entry = { text, mood, timestamp: Date.now(), triggers: [], crisis: true };
    entries.push(entry);
    saveEntries(entries);
    show(els.resultsSection);
    return;
  }

  hide(els.crisisSection);

  // 3. Deterministic engine analysis — fully functional with no key or network.
  const triggers    = extractTriggers(text);
  const trend       = computeMoodTrend(entries);
  const coping      = suggestCoping(triggers, trend);
  const mindfulness = suggestMindfulness(mood, triggers);
  const encourage   = pickEncouragement(trend);
  const summary     = generateWeeklySummary(entries);

  // 4. Render synchronous results immediately.
  renderTriggers(els.triggerContainer, triggers);
  renderMoodTrend(els.trendContainer, trend, entries);
  renderCoping(els.copingContainer, coping, trend === 'declining');
  renderMindfulness(els.mindfulnessContainer, mindfulness);
  renderEncouragement(els.encouragementContainer, encourage);
  renderWeeklySummary(els.summaryContainer, summary);

  show(els.insightsSection);
  show(els.resultsSection);

  // 5. Persist entry.
  const entry = { text, mood, timestamp: Date.now(), triggers, crisis: false };
  entries.push(entry);
  saveEntries(entries);
  renderHistory(els.historyContainer, entries);

  // 6. Scroll to results.
  els.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 7. Generative-AI enhancement (optional, non-blocking, never gates the UI).
  await runAiEnhancement(els, { text, mood, triggers, apiKey, entries });

  // Reset the entry field for the next check-in.
  els.journalTextarea.value = '';
  updateMoodLabel(els.moodSlider, els.moodLabel);
  els.submitBtn.disabled = false;
  els.submitBtn.textContent = 'Save Entry';
}

/**
 * Runs the optional Gemini enhancement after synchronous results are visible.
 *
 * Privacy model:
 *  - With explicit consent, `analyzeJournal` reads the raw entry to surface
 *    hidden patterns (the core GenAI capability the challenge asks for).
 *  - Without consent, only the mood + anonymised trigger categories are sent.
 * Either way the call is best-effort: failures resolve to null and the
 * already-rendered engine insights stand on their own.
 *
 * @param {object} els
 * @param {{text: string, mood: number, triggers: string[], apiKey: string, entries: Array}} ctx
 */
async function runAiEnhancement(els, { text, mood, triggers, apiKey, entries }) {
  if (!apiKey) {
    setLive(els.aiLiveRegion, '');
    return;
  }

  const consented = !!(els.aiConsent && els.aiConsent.checked);
  setLive(els.aiLiveRegion, `<p class="ai-loading">✨ Generating a deeper reflection…</p>`);

  if (consented) {
    const ai = await analyzeJournal(text, mood, apiKey);
    renderAIReflection(els.aiLiveRegion, ai);
    return;
  }

  // No consent to read raw text — fall back to anonymised insight.
  const [empathy, patterns] = await Promise.all([
    generateEmpathyResponse(mood, triggers, apiKey),
    analyzePatterns(entries, apiKey),
  ]);
  renderAIReflection(els.aiLiveRegion, {
    reflection: empathy || '',
    hiddenPatterns: [],
    deeperInsight: patterns || '',
  });
}

/**
 * Loads the built-in sample week so the full experience is visible instantly,
 * even without an API key. Replaces any existing entries (with confirmation when
 * data is present), derives triggers via the engine, and re-renders everything.
 *
 * @param {object} els
 * @param {Array} entries - Mutable entries array (replaced in place).
 */
function loadSampleWeek(els, entries) {
  if (entries.length > 0 &&
      !window.confirm('Load the sample week? This replaces your current entries.')) {
    return;
  }

  const now = Date.now();
  const samples = SAMPLE_ENTRIES.map((s) => {
    const text = sanitizeInput(s.text);
    return {
      text,
      mood: Math.min(5, Math.max(1, Number(s.mood) || 3)),
      timestamp: now - s.daysAgo * DAY_MS,
      triggers: extractTriggers(text),
      crisis: false,
    };
  });

  entries.length = 0;
  entries.push(...samples);
  saveEntries(entries);

  // Re-render the longitudinal views from the freshly loaded data.
  const trend = computeMoodTrend(entries);
  renderHistory(els.historyContainer, entries);
  renderWeeklySummary(els.summaryContainer, generateWeeklySummary(entries));
  renderMoodTrend(els.trendContainer, trend, entries);
  renderTriggers(els.triggerContainer, entries[entries.length - 1].triggers);
  renderCoping(els.copingContainer, suggestCoping(entries[entries.length - 1].triggers, trend), trend === 'declining');
  renderMindfulness(els.mindfulnessContainer, suggestMindfulness(entries[entries.length - 1].mood, entries[entries.length - 1].triggers));
  renderEncouragement(els.encouragementContainer, pickEncouragement(trend));
  setLive(els.aiLiveRegion, '');
  show(els.insightsSection);
  hide(els.crisisSection);
  show(els.resultsSection);
  els.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Init ──────────────────────────────────────────────────────────────────────

/**
 * Initialises the app once the DOM is ready.
 */
function init() {
  // Collect element references
  const els = {
    journalTextarea:  document.getElementById('journal-textarea'),
    moodSlider:       document.getElementById('mood-slider'),
    moodLabel:        document.getElementById('mood-label'),
    apiKeyInput:      document.getElementById('api-key-input'),
    submitBtn:        document.getElementById('submit-btn'),
    resultsSection:   document.getElementById('results-section'),
    insightsSection:  document.getElementById('insights-section'),
    crisisSection:    document.getElementById('crisis-section'),
    crisisContainer:  document.getElementById('crisis-container'),
    trendContainer:   document.getElementById('trend-container'),
    triggerContainer: document.getElementById('trigger-container'),
    copingContainer:  document.getElementById('coping-container'),
    mindfulnessContainer: document.getElementById('mindfulness-container'),
    encouragementContainer: document.getElementById('encouragement-container'),
    summaryContainer: document.getElementById('summary-container'),
    historyContainer: document.getElementById('history-container'),
    helplinesContainer: document.getElementById('helplines-container'),
    aiLiveRegion:     document.getElementById('ai-live-region'),
    aiConsent:        document.getElementById('ai-consent'),
    demoBtn:          document.getElementById('demo-btn'),
  };

  // Load persisted entries
  const entries = loadEntries();

  // Render helplines (always visible)
  if (els.helplinesContainer) {
    renderHelplines(els.helplinesContainer);
  }

  // Render history on load
  if (els.historyContainer) {
    renderHistory(els.historyContainer, entries);
  }

  // Render initial summary
  if (els.summaryContainer) {
    renderWeeklySummary(els.summaryContainer, generateWeeklySummary(entries));
  }

  // Initial trend render
  if (els.trendContainer) {
    renderMoodTrend(els.trendContainer, computeMoodTrend(entries), entries);
  }

  // Mood slider live label
  if (els.moodSlider && els.moodLabel) {
    updateMoodLabel(els.moodSlider, els.moodLabel);
    els.moodSlider.addEventListener('input', () =>
      updateMoodLabel(els.moodSlider, els.moodLabel)
    );
  }

  // Submit button (no form submission — pure JS click handler)
  if (els.submitBtn) {
    els.submitBtn.addEventListener('click', () => handleSubmit(els, entries));
  }

  // "Load sample week" demo — lets anyone see the full experience instantly.
  if (els.demoBtn) {
    els.demoBtn.addEventListener('click', () => loadSampleWeek(els, entries));
  }

  // Allow Ctrl+Enter to submit from textarea
  if (els.journalTextarea) {
    els.journalTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(els, entries);
      }
    });
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
