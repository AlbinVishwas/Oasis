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
 * Generates a personalised empathetic response to a single journal entry.
 * The response acknowledges the user's mood and validates their feelings
 * without minimising or offering unsolicited advice.
 * Returns null if no API key is provided or if the call fails for any reason.
 *
 * @param {string} entry - The journal entry text from the user.
 * @param {number} mood - The mood rating (1-5) submitted with the entry.
 * @param {string|null|undefined} apiKey - Gemini API key. If falsy, returns null immediately.
 * @returns {Promise<string|null>} A warm, empathetic response string, or null on failure.
 *
 * @example
 * const response = await generateEmpathyResponse(entry, 2, apiKey);
 * if (response) renderEmpathyCard(response);
 */
export async function generateEmpathyResponse(entry, mood, apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) return null;
  if (!entry || typeof entry !== 'string') return null;

  const moodLabels = { 1: 'very low', 2: 'low', 3: 'neutral', 4: 'good', 5: 'great' };
  const moodLabel = moodLabels[mood] || 'neutral';

  // Truncate entry to avoid sending excessive personal data
  const truncatedEntry = entry.slice(0, 800);

  const prompt = `You are a compassionate wellness companion for Indian students and exam aspirants. A user has shared a journal entry and rated their mood as ${moodLabel} (${mood}/5).

Your task: Write a warm, empathetic response in 2-3 sentences that:
- Acknowledges and validates what they're feeling
- Does NOT minimise their experience ("at least...", "others have it worse")
- Does NOT give advice unless it's a single, gentle, concrete suggestion
- Uses a calm, peer-like tone (not clinical or overly formal)
- Is appropriate for a ${moodLabel} mood

Journal entry: "${truncatedEntry}"

Respond in 2-3 sentences only. Plain English, no bullet points.`;

  return callGemini(prompt, apiKey);
}
