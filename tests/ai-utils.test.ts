import { describe, it, expect } from 'vitest';
import { calculateEstimatedCost, PRICING } from '../src/lib/ai-utils';

describe('calculateEstimatedCost', () => {
  it('calculates cost for openai model', () => {
    const cost = calculateEstimatedCost('openai', 'gpt-4o-mini', 100, 200);
    const per1k = PRICING.openai['gpt-4o-mini'];
    expect(cost).toBe((300 / 1000) * per1k);
  });

  it('uses default pricing when model unknown', () => {
    const cost = calculateEstimatedCost('gemini', 'unknown-model', 50, 50);
    const per1k = PRICING.gemini.default;
    expect(cost).toBe((100 / 1000) * per1k);
  });

  it('calculates cost for groq model', () => {
    const cost = calculateEstimatedCost('groq', 'llama-3.1-8b-instant', 1000, 1000);
    const per1k = PRICING.groq['llama-3.1-8b-instant'];
    expect(cost).toBe((2000 / 1000) * per1k);
  });
});
