/**
 * @fileoverview Wellness domain data for Oasis — the single source of truth for
 * all content the app reasons over: the mood scale, stress-trigger keywords,
 * coping strategies, adaptive mindfulness exercises, motivational encouragements,
 * crisis-detection phrases, emergency helplines, and a sample week used by the
 * built-in demo. Pure data only — no logic, no side effects.
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
 * Adaptive mindfulness exercises. The engine selects one based on the user's
 * current mood and detected triggers (see `suggestMindfulness`), so the practice
 * offered actually fits what the student is going through right now.
 * @type {Array.<{id: string, name: string, durationMin: number, bestFor: string[], steps: string[]}>}
 */
export const MINDFULNESS_EXERCISES = [
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    durationMin: 2,
    bestFor: ['syllabus_overload', 'mock_performance'],
    steps: [
      'Breathe in slowly through your nose for 4 counts.',
      'Hold your breath gently for 4 counts.',
      'Exhale through your mouth for 4 counts.',
      'Hold empty for 4 counts, then repeat the square four times.',
    ],
  },
  {
    id: '4-7-8-breath',
    name: '4-7-8 Calming Breath',
    durationMin: 2,
    bestFor: ['sleep_disruption'],
    steps: [
      'Empty your lungs completely.',
      'Breathe in quietly through your nose for 4 counts.',
      'Hold the breath for 7 counts.',
      'Exhale fully through your mouth for 8 counts. Repeat three to four times.',
    ],
  },
  {
    id: 'five-senses-grounding',
    name: '5-4-3-2-1 Grounding',
    durationMin: 3,
    bestFor: ['backlog_anxiety'],
    steps: [
      'Name 5 things you can see around you.',
      'Notice 4 things you can physically feel.',
      'Listen for 3 distinct sounds.',
      'Identify 2 things you can smell.',
      'Acknowledge 1 thing you can taste.',
    ],
  },
  {
    id: 'self-compassion-pause',
    name: 'Self-Compassion Pause',
    durationMin: 3,
    bestFor: ['peer_comparison', 'family_pressure'],
    steps: [
      'Place a hand on your chest and feel its warmth.',
      'Silently acknowledge: "This is a moment of stress."',
      'Remind yourself: "Stress is part of preparing for something that matters."',
      'Offer yourself the one kind sentence you would tell a friend in your place.',
    ],
  },
  {
    id: 'body-scan',
    name: 'Two-Minute Body Scan',
    durationMin: 2,
    bestFor: ['any'],
    steps: [
      'Sit comfortably and lower or close your eyes.',
      'Move your attention slowly from your toes up to your head.',
      'Notice any tension and let each area soften as you breathe out.',
      'Finish with three slow, full breaths.',
    ],
  },
];

/**
 * Motivational encouragements keyed by mood trend. Used by `pickEncouragement`
 * to offer context-aware, non-toxic positivity ("a dip is data, not a verdict").
 * @type {Object.<string, string[]>}
 */
export const ENCOURAGEMENTS = {
  rising: [
    'Your effort is compounding — the upward trend in your mood is evidence you are doing something right. Protect the habits that got you here.',
    'Momentum is on your side this week. Small, repeatable wins are exactly how long preparations are won.',
  ],
  declining: [
    'A dip is data, not a verdict. Even students who clear these exams have heavy weeks — what matters is that you showed up to reflect.',
    'Be as patient with yourself as you would be with a friend preparing for the same exam. This week does not define your result.',
  ],
  stable: [
    'Consistency under real pressure is an underrated superpower. Steady is exactly the pace that sustains a long preparation.',
    'You are holding your ground while carrying a lot. That is resilience, even on the days it does not feel like it.',
  ],
  insufficient_data: [
    'Every honest check-in sharpens the insights you will get next. You have started — and that is the hardest part.',
    'One reflection is already an act of self-care. Keep going at your own pace; the picture gets clearer with each entry.',
  ],
};

/**
 * A realistic sample week of an exam aspirant's entries, used by the built-in
 * "Load sample week" demo so the full experience (trends, triggers, coping,
 * summary) is visible instantly — even without an API key. `daysAgo` is resolved
 * to a timestamp at load time; triggers are derived by the engine, not hardcoded.
 * @type {Array.<{daysAgo: number, mood: number, text: string}>}
 */
export const SAMPLE_ENTRIES = [
  { daysAgo: 6, mood: 3, text: 'Started the week okay. Made a rough timetable for the pending syllabus but there is so much to study that it already feels overwhelming.' },
  { daysAgo: 5, mood: 2, text: 'Bad mock score today, way below my usual rank. I keep thinking everyone else in my batch is doing better than me.' },
  { daysAgo: 4, mood: 2, text: 'Could not sleep again, kept staring at the ceiling till 3 am replaying the test. Woke up exhausted and behind on revision.' },
  { daysAgo: 3, mood: 3, text: 'Parents asked about my preparation at dinner and I felt that familiar pressure. Tried to just focus on finishing two chapters.' },
  { daysAgo: 2, mood: 4, text: 'Better day. Cleared a big backlog topic I had been avoiding and it felt good to actually understand it.' },
  { daysAgo: 1, mood: 4, text: 'Did a full-length test series paper and stayed calm even on the hard section. Compared less to others today.' },
  { daysAgo: 0, mood: 4, text: 'Feeling a bit more in control. Still tired but the sleep schedule is slowly improving and the syllabus feels less infinite.' },
];

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
