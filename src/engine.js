/**
 * @fileoverview Pure analysis engine for Oasis. Every export is a deterministic,
 * side-effect-free function (no DOM, network, storage, or wall-clock reads beyond
 * an injected `now`), which makes the whole engine unit-testable in isolation and
 * lets the app deliver real value offline — with the Gemini layer as enhancement.
 */

import {
  TRIGGER_KEYWORDS,
  COPING_STRATEGIES,
  CRISIS_KEYWORDS,
  MOOD_SCALE,
  MINDFULNESS_EXERCISES,
  ENCOURAGEMENTS,
} from '../data/wellness.js';

/**
 * Sanitizes user input by trimming whitespace and enforcing a maximum length.
 * Returns an empty string for null, undefined, or non-string values.
 *
 * @param {*} text - Raw user input to sanitize.
 * @param {number} [maxLength=5000] - Maximum allowed character length.
 * @returns {string} Sanitized string, never null or undefined.
 *
 * @example
 * sanitizeInput('  hello  '); // 'hello'
 * sanitizeInput(null);        // ''
 */
export function sanitizeInput(text, maxLength = 5000) {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, maxLength);
}

/**
 * Extracts stress trigger categories from a journal entry text.
 * Performs case-insensitive matching against TRIGGER_KEYWORDS.
 * Returns each matched category only once, regardless of how many keywords match.
 *
 * @param {string} text - Journal entry text to analyse.
 * @returns {string[]} Array of matched trigger category names (e.g. ['syllabus_overload', 'sleep_disruption']).
 *
 * @example
 * extractTriggers('I failed my mock test and cannot sleep');
 * // returns ['mock_performance', 'sleep_disruption']
 */
export function extractTriggers(text) {
  if (!text || typeof text !== 'string') return [];

  const lower = text.toLowerCase();
  const found = [];

  for (const [category, keywords] of Object.entries(TRIGGER_KEYWORDS)) {
    const matched = keywords.some((kw) => lower.includes(kw.toLowerCase()));
    if (matched) {
      found.push(category);
    }
  }

  return found;
}

/**
 * Computes the mood trend across an array of journal entries.
 * Compares the average mood of the most recent half of entries to the earlier half.
 * Requires at least 4 entries (2 per half) to produce a meaningful, low-noise trend.
 *
 * @param {Array.<{mood: number, timestamp: number}>} entries - Journal entries sorted oldest-first.
 * @returns {'rising'|'declining'|'stable'|'insufficient_data'} The computed trend label.
 *
 * @example
 * computeMoodTrend([{mood:2},{mood:2},{mood:4},{mood:5}]); // 'rising'
 * computeMoodTrend([{mood:5},{mood:5},{mood:2},{mood:1}]); // 'declining'
 * computeMoodTrend([{mood:3}]);                            // 'insufficient_data'
 */
export function computeMoodTrend(entries) {
  if (!Array.isArray(entries) || entries.length < 4) {
    return 'insufficient_data';
  }

  const mid = Math.floor(entries.length / 2);
  const earlier = entries.slice(0, mid);
  const recent = entries.slice(mid);

  const avg = (arr) =>
    arr.reduce((sum, e) => sum + (Number(e.mood) || 0), 0) / arr.length;

  const earlierAvg = avg(earlier);
  const recentAvg = avg(recent);
  const delta = recentAvg - earlierAvg;

  if (delta > 0.5) return 'rising';
  if (delta < -0.5) return 'declining';
  return 'stable';
}

/**
 * Detects whether a journal entry contains crisis-related language.
 * Matches against CRISIS_KEYWORDS using a case-insensitive substring scan,
 * exiting early on the first match. Empty or blank input returns false.
 *
 * @param {string} text - Journal entry text to scan.
 * @returns {boolean} True if any crisis phrase is present, otherwise false.
 *
 * @example
 * detectCrisis('I want to die');    // true
 * detectCrisis('I want to study');  // false
 */
export function detectCrisis(text) {
  if (!text || typeof text !== 'string') return false;

  const lower = text.toLowerCase();

  for (const phrase of CRISIS_KEYWORDS) {
    if (lower.includes(phrase.toLowerCase())) return true;
  }

  return false;
}

/**
 * Suggests coping strategies based on detected triggers and mood trend.
 * When mood is declining, returns 2 strategies per trigger (escalated support).
 * When mood is stable or rising, returns 1 strategy per trigger.
 * Falls back to general strategies if no triggers are provided.
 *
 * @param {string[]} triggers - Array of trigger category names from extractTriggers().
 * @param {'rising'|'declining'|'stable'|'insufficient_data'} moodTrend - Mood trend from computeMoodTrend().
 * @returns {Array.<{category: string, strategies: string[]}>} Ordered list of category–strategy pairs.
 *
 * @example
 * suggestCoping(['sleep_disruption'], 'declining');
 * // [{ category: 'sleep_disruption', strategies: ['...strategy 1...', '...strategy 2...'] }]
 */
export function suggestCoping(triggers, moodTrend) {
  const isEscalated = moodTrend === 'declining';
  const strategiesPerTrigger = isEscalated ? 2 : 1;

  if (!Array.isArray(triggers) || triggers.length === 0) {
    // Generic fallback: offer first strategy from each of the first two categories
    const fallbackCategories = Object.keys(COPING_STRATEGIES).slice(0, 2);
    return fallbackCategories.map((cat) => ({
      category: cat,
      strategies: COPING_STRATEGIES[cat].slice(0, 1),
    }));
  }

  return triggers
    .filter((t) => COPING_STRATEGIES[t])
    .map((trigger) => ({
      category: trigger,
      strategies: COPING_STRATEGIES[trigger].slice(0, strategiesPerTrigger),
    }));
}

/**
 * Selects a single adaptive mindfulness exercise that fits the student's current
 * state. Triggers take priority (a specific stressor gets a matching practice);
 * a low mood with no specific trigger falls back to calming box breathing; and
 * anything else gets a gentle general body scan. Deterministic for a given input.
 *
 * @param {number} mood - Current mood rating (1-5).
 * @param {string[]} triggers - Trigger categories from extractTriggers().
 * @returns {{id: string, name: string, durationMin: number, steps: string[]}} The chosen exercise.
 *
 * @example
 * suggestMindfulness(2, ['sleep_disruption']).id; // '4-7-8-breath'
 */
export function suggestMindfulness(mood, triggers) {
  const list = Array.isArray(triggers) ? triggers : [];

  // 1. Prefer an exercise whose `bestFor` matches a detected trigger,
  //    in TRIGGER_KEYWORDS order so the result is stable and predictable.
  for (const category of Object.keys(TRIGGER_KEYWORDS)) {
    if (!list.includes(category)) continue;
    const match = MINDFULNESS_EXERCISES.find((ex) => ex.bestFor.includes(category));
    if (match) return match;
  }

  // 2. No specific trigger: a low mood gets the most calming breath work.
  if (Number(mood) <= 2) {
    const calming = MINDFULNESS_EXERCISES.find((ex) => ex.id === 'box-breathing');
    if (calming) return calming;
  }

  // 3. Otherwise, a gentle general-purpose practice.
  return (
    MINDFULNESS_EXERCISES.find((ex) => ex.bestFor.includes('any')) ||
    MINDFULNESS_EXERCISES[0]
  );
}

/**
 * Picks a context-aware motivational encouragement for the given mood trend.
 * Returns the first line for each trend so the result is deterministic and
 * testable. Falls back to the `insufficient_data` set for unknown trends.
 *
 * @param {'rising'|'declining'|'stable'|'insufficient_data'} trend - Mood trend.
 * @returns {string} A single encouraging sentence.
 */
export function pickEncouragement(trend) {
  const lines = ENCOURAGEMENTS[trend] || ENCOURAGEMENTS.insufficient_data;
  return lines[0];
}

/**
 * Generates a weekly summary aggregating journal entries from the past 7 days.
 * Returns counts, averages, top triggers, and a plain-language mood narrative.
 *
 * @param {Array.<{mood: number, timestamp: number, triggers: string[]}>} entries - All stored journal entries.
 * @returns {{
 *   totalEntries: number,
 *   averageMood: number|null,
 *   moodLabel: string|null,
 *   topTriggers: string[],
 *   trend: string,
 *   narrative: string
 * }} Aggregated weekly summary object.
 *
 * @param {number} [now=Date.now()] - Reference timestamp for the 7-day window.
 *   Injected so the function stays pure and deterministic in tests.
 *
 * @example
 * generateWeeklySummary([]);
 * // { totalEntries: 0, averageMood: null, moodLabel: null, topTriggers: [], trend: 'insufficient_data', narrative: '...' }
 */
export function generateWeeklySummary(entries, now = Date.now()) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      totalEntries: 0,
      averageMood: null,
      moodLabel: null,
      topTriggers: [],
      trend: 'insufficient_data',
      narrative: 'No entries this week. Start journalling to see your wellness summary here.',
    };
  }

  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const weekEntries = entries.filter((e) => e.timestamp >= oneWeekAgo);

  if (weekEntries.length === 0) {
    return {
      totalEntries: 0,
      averageMood: null,
      moodLabel: null,
      topTriggers: [],
      trend: 'insufficient_data',
      narrative: 'No entries in the past 7 days. Start journalling to track your progress.',
    };
  }

  // Average mood
  const totalMood = weekEntries.reduce((sum, e) => sum + (Number(e.mood) || 0), 0);
  const averageMood = Math.round((totalMood / weekEntries.length) * 10) / 10;
  const moodRounded = Math.round(averageMood);
  const moodLabel = (MOOD_SCALE.find((m) => m.value === moodRounded) || {}).label || 'Neutral';

  // Top triggers frequency count
  const triggerCounts = {};
  for (const entry of weekEntries) {
    if (Array.isArray(entry.triggers)) {
      for (const t of entry.triggers) {
        triggerCounts[t] = (triggerCounts[t] || 0) + 1;
      }
    }
  }
  const topTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  // Trend
  const trend = computeMoodTrend(weekEntries);

  // Narrative
  const trendPhrases = {
    rising: 'Your mood has been improving — keep going.',
    declining: 'Your mood has dipped this week — that\'s okay; reaching out helps.',
    stable: 'Your mood has been fairly consistent this week.',
    insufficient_data: 'Not enough data yet for a trend.',
  };

  const triggerPhrase =
    topTriggers.length > 0
      ? `Your main stress sources appear to be: ${topTriggers.join(', ')}.`
      : 'No specific stress patterns were detected.';

  const narrative = `This week you logged ${weekEntries.length} ${weekEntries.length === 1 ? 'entry' : 'entries'} with an average mood of ${averageMood}/5 (${moodLabel}). ${trendPhrases[trend]} ${triggerPhrase}`;

  return {
    totalEntries: weekEntries.length,
    averageMood,
    moodLabel,
    topTriggers,
    trend,
    narrative,
  };
}
