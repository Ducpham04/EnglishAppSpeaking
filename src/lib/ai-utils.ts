// Utility helpers for AI usage cost estimation and parsing
export const PRICING: Record<string, Record<string, number> & { default: number }> = {
  gemini: { default: 0.03, 'gemini-2.5-flash': 0.03 },
  openai: { default: 0.002, 'gpt-4o-mini': 0.002, 'gpt-4o': 0.03 },
  groq: {
    default: 0.0002,
    'llama-3.1-8b-instant': 0.000065,
    'llama-3.3-70b-versatile': 0.00069,
    'openai/gpt-oss-20b': 0.0001875,
    'openai/gpt-oss-120b': 0.000375,
    'meta-llama/llama-4-scout-17b-16e-instruct': 0.000225,
    'qwen/qwen3-32b': 0.00044,
  },
};

export function calculateEstimatedCost(
  provider: 'gemini' | 'openai' | 'groq',
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const per1k = (PRICING[provider][model] ?? PRICING[provider].default) as number;
  const estimated = ((inputTokens + outputTokens) / 1000) * per1k;
  // Round to 6 decimal places
  return Math.round(estimated * 1000000) / 1000000;
}

export function cleanJSONText(text: string) {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

const aiUtils = { PRICING, calculateEstimatedCost, cleanJSONText };

export default aiUtils;
