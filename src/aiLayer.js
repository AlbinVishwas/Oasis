/**
 * @fileoverview AI layer for MindEase — wraps Gemini 1.5 Flash API calls.
 * All functions fail gracefully: they return null on any error or missing key.
 * The API key is never logged, stored, or included in error messages.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Internal helper to call the Gemini API with a prompt.
 * Strips the API key from any caught errors before they propagate.
 *
 * @param {string} prompt - The full prompt to send.
 * @param {string} apiKey - Gemini API key (never logged or stored).
 * @returns {Promise<string|null>} The generated text, or null on any failure.
 */
async function callGemini(prompt, apiKey) {
  try {
    const url = `${GEMINI_API_BASE}?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 400,
        topP: 0.9,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Don't include response body (may echo key in some error formats)
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === 'string' ? text.trim() : null;
  } catch {
    // Swallow all errors — never expose or log the key
    return null;
  }
}

/**
 * Analyses patterns across multiple journal entries using Gemini AI.
 * Identifies recurring themes, emotional arcs, and areas of concern.
 * Returns null if no API key is provided or if the call fails for any reason.
 *
 * @param {Array.<{text: string, mood: number, timestamp: number, triggers: string[]}>} entries - Journal entries to analyse.
 * @param {string|null|undefined} apiKey - Gemini API key. If falsy, returns null immediately.
 * @returns {Promise<string|null>} A textual analysis of patterns, or null on failure.
 *
 * @example
 * const analysis = await analyzePatterns(entries, apiKey);
 * if (analysis) showAIPanel(analysis);
 */
export async function analyzePatterns(entries, apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) return null;
  if (!Array.isArray(entries) || entries.length === 0) return null;

  // Prepare a privacy-conscious summary (no raw text, just themes and moods)
  const summaries = entries.slice(-10).map((e, i) => {
    const date = new Date(e.timestamp).toLocaleDateString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    const triggers = Array.isArray(e.triggers) && e.triggers.length > 0
      ? e.triggers.join(', ')
      : 'none identified';
    return `Entry ${i + 1} (${date}): mood ${e.mood}/5, stress triggers: ${triggers}.`;
  });

  const prompt = `You are a compassionate, professional mental wellness assistant supporting Indian exam aspirants (UPSC, JEE, NEET, CAT, etc.).

Analyse the following journal pattern summary and provide warm, evidence-based insights in 3-4 sentences. Focus on patterns, not judgement. Be empathetic and solution-oriented. Do NOT diagnose, prescribe, or use clinical language. Suggest one concrete next step.

Journal pattern data:
${summaries.join('\n')}

Respond in plain English, conversational tone, 3-4 sentences maximum.`;

  return callGemini(prompt, apiKey);
}

/**
 * Generates a personalised empathetic response for the current check-in.
 *
 * Privacy by design: the user's raw journal text is NEVER sent to the model.
 * The prompt is built only from the mood rating and the anonymised stress
 * trigger categories already derived locally by the engine.
 * Returns null if no API key is provided or if the call fails for any reason.
 *
 * @param {number} mood - The mood rating (1-5) submitted with the entry.
 * @param {string[]} triggers - Anonymised trigger category names (e.g. ['sleep_disruption']).
 * @param {string|null|undefined} apiKey - Gemini API key. If falsy, returns null immediately.
 * @returns {Promise<string|null>} A warm, empathetic response string, or null on failure.
 *
 * @example
 * const response = await generateEmpathyResponse(2, ['sleep_disruption'], apiKey);
 * if (response) renderEmpathyCard(response);
 */
export async function generateEmpathyResponse(mood, triggers, apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) return null;

  const moodLabels = { 1: 'very low', 2: 'low', 3: 'neutral', 4: 'good', 5: 'great' };
  const moodLabel = moodLabels[mood] || 'neutral';

  // Only anonymised category names leave the device — never the raw entry.
  const themes = Array.isArray(triggers) && triggers.length > 0
    ? triggers.map((t) => String(t).replace(/_/g, ' ')).join(', ')
    : 'none identified';

  const prompt = `You are a compassionate wellness companion for Indian students and exam aspirants. A user has just checked in. Their self-rated mood is ${moodLabel} (${mood}/5), and the stress themes detected today are: ${themes}.

Your task: Write a warm, empathetic response in 2-3 sentences that:
- Acknowledges and validates what they may be feeling, given the mood and themes
- Does NOT minimise their experience ("at least...", "others have it worse")
- Does NOT give advice unless it's a single, gentle, concrete suggestion
- Uses a calm, peer-like tone (not clinical or overly formal)
- Is appropriate for a ${moodLabel} mood

Respond in 2-3 sentences only. Plain English, no bullet points.`;

  return callGemini(prompt, apiKey);
}
