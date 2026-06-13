/**
 * @fileoverview Wellness data constants for the MindEase companion app.
 * Provides mood scale, trigger keywords, coping strategies, crisis detection
 * data, and emergency helpline information.
 */

/**
 * Mood scale — ascending list of the five self-report levels.
 * Each entry carries its numeric value, a descriptive label, and an emoji.
 * @type {Array.<{value: number, label: string, emoji: string}>}
 */
export const MOOD_SCALE = [
  { value: 1, label: 'Very Low', emoji: '😞' },
  { value: 2, label: 'Low',      emoji: '😟' },
  { value: 3, label: 'Neutral',  emoji: '😐' },
  { value: 4, label: 'Good',     emoji: '🙂' },
  { value: 5, label: 'Great',    emoji: '😊' },
];

/**
 * Trigger keyword categories mapped to arrays of associated keywords/phrases.
 * Used to identify stress sources in journal entries.
 * @type {Object.<string, string[]>}
 */
export const TRIGGER_KEYWORDS = {
  syllabus_overload: [
    'syllabus', 'chapters', 'topics', 'curriculum', 'portion', 'coverage',
    'incomplete syllabus', 'pending topics', 'not done', 'left to study',
    'haven\'t covered', 'so much to study', 'overwhelming syllabus',
  ],
  mock_performance: [
    'mock test', 'mock exam', 'practice test', 'practice exam', 'mock score',
    'failed mock', 'bad score', 'low score', 'poor performance', 'rank drop',
    'all india mock', 'test series', 'sectional test', 'full length test',
    'mocks', 'prelims score',
  ],
  peer_comparison: [
    'everyone else', 'my friends', 'others are', 'classmates', 'batchmates',
    'topper', 'rank holder', 'better than me', 'doing better', 'ahead of me',
    'compared to', 'my rank', 'percentile', 'they scored', 'she scored',
    'he scored', 'jealous', 'why am i not',
  ],
  sleep_disruption: [
    'can\'t sleep', 'couldn\'t sleep', 'insomnia', 'sleep deprived',
    'not sleeping', 'no sleep', 'sleep less', 'slept late', 'woke up early',
    'tired', 'exhausted', 'fatigue', 'restless night', 'nightmares',
    'sleep schedule', 'disrupted sleep', '3 am', '4 am', 'all night',
  ],
  family_pressure: [
    'parents', 'mom', 'dad', 'mother', 'father', 'family pressure',
    'family expectations', 'relatives', 'aunt', 'uncle', 'siblings',
    'home pressure', 'family stress', 'fights at home', 'argument with parents',
    'they expect', 'family wants', 'parents are upset', 'disappointing family',
  ],
  backlog_anxiety: [
    'backlog', 'backlogs', 'pending revision', 'haven\'t revised',
    'not revised', 'incomplete notes', 'missed classes', 'missed sessions',
    'behind schedule', 'falling behind', 'not on track', 'accumulated work',
    'piled up', 'too much pending', 'revision pending', 'catching up',
  ],
};

/**
 * Coping strategies mapped by trigger category.
 * Each category has exactly 3 actionable strategies tailored to that stressor.
 * @type {Object.<string, string[]>}
 */
export const COPING_STRATEGIES = {
  syllabus_overload: [
    'Break the syllabus into micro-units of 20 minutes each and tackle one at a time — progress compounds.',
    'Create a prioritised topic list: high-weight exam topics first. Remind yourself that 80% of marks often come from 20% of content.',
    'Talk to a mentor or senior who cleared the exam — ask how they managed the syllabus without feeling paralysed.',
  ],
  mock_performance: [
    'Review the test paper analytically — categorise mistakes as "didn\'t know", "silly error", or "ran out of time". Each needs a different fix.',
    'Set a private baseline: only compare your current mock with your own previous mock. External rankings are noise.',
    'After every mock, write three things you understood well. Your brain needs evidence of progress to stay motivated.',
  ],
  peer_comparison: [
    'Comparison is a data problem — you only see others\' highlights, not their struggles. Your timeline is your own.',
    'Write down one specific skill or habit you have that the person you\'re comparing yourself to might not.',
    'Set a "comparison-free hour" daily: phone on DND, no social media. Use that time to focus on your own work.',
  ],
  sleep_disruption: [
    'Try a 4-7-8 breathing pattern before bed: inhale 4 counts, hold 7, exhale 8. Do 3 cycles.',
    'Keep your study area and sleep area separate if possible — train your brain to associate bed with rest.',
    'Aim for a consistent wake time even if sleep was poor. Regulating your wake time anchors your circadian rhythm faster than regulating bedtime.',
  ],
  family_pressure: [
    'You cannot pour from an empty cup. Protecting your mental space is not selfish — it\'s essential for the outcome your family wants too.',
    'Try having a calm, brief conversation: "I am doing my best and I need support, not pressure right now."',
    'Identify one family member who is more understanding and use them as a bridge when interactions feel overwhelming.',
  ],
  backlog_anxiety: [
    'Do a quick backlog audit: list everything pending. The act of listing removes the "infinite unknown" feeling that causes anxiety.',
    'Use a "two-minute rule" — if a backlog task can be started in two minutes, start it now even if you don\'t finish.',
    'Accept that some backlog is normal; high-performing exam aspirants often drop lower-priority topics strategically. Prioritise ruthlessly.',
  ],
};

/**
 * Crisis detection keywords — phrases that may indicate serious distress.
 * When detected, the app shows crisis support resources immediately.
 * These are handled with care: detection triggers support, not alarm.
 * @type {string[]}
 */
export const CRISIS_KEYWORDS = [
  'want to die', 'kill myself', 'end my life', 'suicidal', 'suicide',
  'no reason to live', 'better off dead', 'can\'t go on', 'give up on life',
  'hurt myself', 'self harm', 'cutting myself', 'not worth living',
  'wish i was dead', 'don\'t want to be here', 'disappear forever',
  'end it all', 'can\'t take it anymore', 'life is meaningless',
  'nobody would miss me', 'burden to everyone',
];

/**
 * Emergency mental health helplines for India.
 * Always displayed to users; never gated behind any API or feature flag.
 * @type {Array.<{name: string, number: string, description: string}>}
 */
export const HELPLINES = [
  {
    name: 'Tele-MANAS',
    number: '14416',
    description: 'Government of India\'s free 24/7 mental health helpline. Trained counsellors available in multiple languages. Call anytime — no appointment needed.',
  },
  {
    name: 'iCall',
    number: '9152987821',
    description: 'TISS-run professional psychosocial support service. Available Mon–Sat, 8 AM–10 PM. Offers counselling, referrals, and crisis support for students and young adults.',
  },
  {
    name: 'Emergency Services',
    number: '112',
    description: 'India\'s national emergency number for immediate danger — connects you to police, ambulance, and medical help, 24/7 across the country.',
  },
];
