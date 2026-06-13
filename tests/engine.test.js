/**
 * @fileoverview Test suite for src/engine.js using node:test.
 * Covers: trigger extraction, crisis detection (true and false positives),
 * mood trend computation, coping suggestions (variation + escalation),
 * weekly summary aggregation, sanitizeInput edge cases.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractTriggers,
  detectCrisis,
  computeMoodTrend,
  suggestCoping,
  generateWeeklySummary,
  sanitizeInput,
} from '../src/engine.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Creates a journal entry stub with sensible defaults.
 * @param {Partial<{text:string, mood:number, timestamp:number, triggers:string[]}>} overrides
 */
function makeEntry(overrides = {}) {
  return {
    text: 'test entry',
    mood: 3,
    timestamp: Date.now(),
    triggers: [],
    ...overrides,
  };
}

// ─── 1. sanitizeInput — empty / null ─────────────────────────────────────────

test('sanitizeInput returns empty string for null', () => {
  assert.equal(sanitizeInput(null), '');
});

test('sanitizeInput returns empty string for undefined', () => {
  assert.equal(sanitizeInput(undefined), '');
});

test('sanitizeInput trims leading and trailing whitespace', () => {
  assert.equal(sanitizeInput('  hello  '), 'hello');
});

test('sanitizeInput returns empty string for non-string types', () => {
  assert.equal(sanitizeInput(42), '');
  assert.equal(sanitizeInput({}), '');
  assert.equal(sanitizeInput([]), '');
});

test('sanitizeInput truncates input exceeding maxLength', () => {
  const long = 'a'.repeat(6000);
  const result = sanitizeInput(long, 5000);
  assert.equal(result.length, 5000);
});

test('sanitizeInput returns empty string for empty string input', () => {
  assert.equal(sanitizeInput(''), '');
});

// ─── 2. extractTriggers — keyword matching ────────────────────────────────────

test('extractTriggers catches syllabus keyword', () => {
  const triggers = extractTriggers('I have too much syllabus left to study.');
  assert.ok(triggers.includes('syllabus'), 'should detect syllabus trigger');
});

test('extractTriggers catches mock_tests keyword', () => {
  const triggers = extractTriggers('My mock test score was really bad today.');
  assert.ok(triggers.includes('mock_tests'), 'should detect mock_tests trigger');
});

test('extractTriggers catches sleep keyword (case-insensitive)', () => {
  const triggers = extractTriggers("I CAN'T SLEEP and I am exhausted.");
  assert.ok(triggers.includes('sleep'), 'should detect sleep trigger case-insensitively');
});

test('extractTriggers catches family keyword', () => {
  const triggers = extractTriggers('My parents keep putting pressure on me.');
  assert.ok(triggers.includes('family'), 'should detect family trigger');
});

test('extractTriggers catches comparison keyword', () => {
  const triggers = extractTriggers('Everyone else is doing so much better than me.');
  assert.ok(triggers.includes('comparison'), 'should detect comparison trigger');
});

test('extractTriggers catches backlog keyword', () => {
  const triggers = extractTriggers('I have so much backlog to clear before the exam.');
  assert.ok(triggers.includes('backlog'), 'should detect backlog trigger');
});

test('extractTriggers returns empty array for neutral text', () => {
  const triggers = extractTriggers('It was a good day. I went for a walk and felt fine.');
  assert.equal(triggers.length, 0);
});

test('extractTriggers returns each category at most once', () => {
  const triggers = extractTriggers('syllabus syllabus chapters incomplete syllabus');
  const syllabusTriggers = triggers.filter((t) => t === 'syllabus');
  assert.equal(syllabusTriggers.length, 1, 'syllabus should appear exactly once');
});

test('extractTriggers handles empty string', () => {
  assert.deepEqual(extractTriggers(''), []);
});

test('extractTriggers handles null gracefully', () => {
  assert.deepEqual(extractTriggers(null), []);
});

test('extractTriggers can detect multiple categories', () => {
  const triggers = extractTriggers(
    "I failed my mock test, can't sleep, and everyone else seems to be doing better."
  );
  assert.ok(triggers.includes('mock_tests'), 'should detect mock_tests');
  assert.ok(triggers.includes('sleep'), 'should detect sleep');
  assert.ok(triggers.includes('comparison'), 'should detect comparison');
});

// ─── 3. detectCrisis — concerning phrases ────────────────────────────────────

test('detectCrisis flags "want to die"', () => {
  const result = detectCrisis('I just want to die and not wake up tomorrow.');
  assert.equal(result.crisis, true);
  assert.ok(result.matchedPhrase, 'should return a matched phrase');
});

test('detectCrisis flags "suicidal" in sentence', () => {
  const result = detectCrisis('I have been feeling suicidal lately and dont know what to do.');
  assert.equal(result.crisis, true);
});

test('detectCrisis flags "hurt myself"', () => {
  const result = detectCrisis('Sometimes I feel like I want to hurt myself.');
  assert.equal(result.crisis, true);
});

test('detectCrisis does NOT false-positive on neutral text', () => {
  const result = detectCrisis('I want to study more and do well in my exams.');
  assert.equal(result.crisis, false);
  assert.equal(result.matchedPhrase, null);
});

test('detectCrisis does NOT false-positive on "I want to sleep"', () => {
  const result = detectCrisis("I want to sleep but can't because of exam stress.");
  assert.equal(result.crisis, false);
});

test('detectCrisis does NOT false-positive on "I feel like giving up on this chapter"', () => {
  const result = detectCrisis(
    'I feel like giving up on this chapter, it is too hard.'
  );
  assert.equal(result.crisis, false);
});

test('detectCrisis returns crisis:false and null matchedPhrase for empty input', () => {
  const result = detectCrisis('');
  assert.equal(result.crisis, false);
  assert.equal(result.matchedPhrase, null);
});

test('detectCrisis is case-insensitive', () => {
  const result = detectCrisis('I WANT TO DIE.');
  assert.equal(result.crisis, true);
});

// ─── 4. computeMoodTrend ─────────────────────────────────────────────────────

test('computeMoodTrend returns "rising" when recent moods are higher', () => {
  const entries = [
    makeEntry({ mood: 1 }),
    makeEntry({ mood: 2 }),
    makeEntry({ mood: 4 }),
    makeEntry({ mood: 5 }),
  ];
  assert.equal(computeMoodTrend(entries), 'rising');
});

test('computeMoodTrend returns "declining" when recent moods are lower', () => {
  const entries = [
    makeEntry({ mood: 5 }),
    makeEntry({ mood: 5 }),
    makeEntry({ mood: 2 }),
    makeEntry({ mood: 1 }),
  ];
  assert.equal(computeMoodTrend(entries), 'declining');
});

test('computeMoodTrend returns "stable" when mood difference is small', () => {
  const entries = [
    makeEntry({ mood: 3 }),
    makeEntry({ mood: 3 }),
    makeEntry({ mood: 3 }),
    makeEntry({ mood: 3 }),
  ];
  assert.equal(computeMoodTrend(entries), 'stable');
});

test('computeMoodTrend returns "insufficient_data" for a single entry', () => {
  assert.equal(computeMoodTrend([makeEntry({ mood: 3 })]), 'insufficient_data');
});

test('computeMoodTrend returns "insufficient_data" for empty array', () => {
  assert.equal(computeMoodTrend([]), 'insufficient_data');
});

test('computeMoodTrend returns "insufficient_data" for null', () => {
  assert.equal(computeMoodTrend(null), 'insufficient_data');
});

// ─── 5. suggestCoping — variation by trigger category ────────────────────────

test('suggestCoping returns strategies for sleep trigger', () => {
  const result = suggestCoping(['sleep'], 'stable');
  assert.ok(Array.isArray(result), 'should return array');
  assert.ok(result.length > 0, 'should have at least one suggestion');
  assert.equal(result[0].category, 'sleep');
  assert.ok(result[0].strategies.length > 0, 'sleep strategies should be populated');
});

test('suggestCoping returns strategies for family trigger', () => {
  const result = suggestCoping(['family'], 'stable');
  assert.equal(result[0].category, 'family');
});

test('suggestCoping returns strategies for mock_tests trigger', () => {
  const result = suggestCoping(['mock_tests'], 'stable');
  assert.equal(result[0].category, 'mock_tests');
});

test('suggestCoping strategies differ across trigger categories', () => {
  const sleepResult = suggestCoping(['sleep'], 'stable');
  const familyResult = suggestCoping(['family'], 'stable');
  const sleepStrat = sleepResult[0]?.strategies[0];
  const familyStrat = familyResult[0]?.strategies[0];
  assert.notEqual(sleepStrat, familyStrat, 'strategies should differ between categories');
});

test('suggestCoping escalates to 2 strategies per trigger when mood is declining', () => {
  const result = suggestCoping(['sleep'], 'declining');
  assert.ok(
    result[0].strategies.length >= 2,
    'declining mood should escalate to at least 2 strategies'
  );
});

test('suggestCoping returns 1 strategy per trigger when mood is stable', () => {
  const result = suggestCoping(['backlog'], 'stable');
  assert.equal(result[0].strategies.length, 1, 'stable mood should return 1 strategy');
});

test('suggestCoping returns 1 strategy per trigger when mood is rising', () => {
  const result = suggestCoping(['comparison'], 'rising');
  assert.equal(result[0].strategies.length, 1, 'rising mood should return 1 strategy');
});

test('suggestCoping returns fallback when triggers is empty array', () => {
  const result = suggestCoping([], 'stable');
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0, 'should provide fallback strategies');
});

test('suggestCoping returns fallback when triggers is null', () => {
  const result = suggestCoping(null, 'stable');
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0);
});

// ─── 6. generateWeeklySummary ─────────────────────────────────────────────────

test('generateWeeklySummary handles zero entries without throwing', () => {
  assert.doesNotThrow(() => generateWeeklySummary([]));
});

test('generateWeeklySummary returns totalEntries:0 for empty array', () => {
  const summary = generateWeeklySummary([]);
  assert.equal(summary.totalEntries, 0);
});

test('generateWeeklySummary returns null averageMood for empty entries', () => {
  const summary = generateWeeklySummary([]);
  assert.equal(summary.averageMood, null);
});

test('generateWeeklySummary returns empty topTriggers for empty entries', () => {
  const summary = generateWeeklySummary([]);
  assert.deepEqual(summary.topTriggers, []);
});

test('generateWeeklySummary returns a non-empty narrative for empty entries', () => {
  const summary = generateWeeklySummary([]);
  assert.ok(typeof summary.narrative === 'string' && summary.narrative.length > 0);
});

test('generateWeeklySummary aggregates mood correctly', () => {
  const now = Date.now();
  const entries = [
    makeEntry({ mood: 2, timestamp: now - 1000 }),
    makeEntry({ mood: 4, timestamp: now - 2000 }),
  ];
  const summary = generateWeeklySummary(entries);
  assert.equal(summary.averageMood, 3.0);
});

test('generateWeeklySummary identifies top trigger correctly', () => {
  const now = Date.now();
  const entries = [
    makeEntry({ triggers: ['sleep'], timestamp: now - 1000 }),
    makeEntry({ triggers: ['sleep'], timestamp: now - 2000 }),
    makeEntry({ triggers: ['family'], timestamp: now - 3000 }),
  ];
  const summary = generateWeeklySummary(entries);
  assert.equal(summary.topTriggers[0], 'sleep', 'sleep should be the top trigger');
});

test('generateWeeklySummary only counts entries from the past 7 days', () => {
  const now = Date.now();
  const oldEntry = makeEntry({ mood: 1, timestamp: now - 8 * 24 * 60 * 60 * 1000 });
  const recentEntry = makeEntry({ mood: 5, timestamp: now - 1000 });
  const summary = generateWeeklySummary([oldEntry, recentEntry]);
  assert.equal(summary.totalEntries, 1, 'should only count entries within 7 days');
});

test('generateWeeklySummary handles null gracefully without throwing', () => {
  assert.doesNotThrow(() => generateWeeklySummary(null));
  const result = generateWeeklySummary(null);
  assert.equal(result.totalEntries, 0);
});
