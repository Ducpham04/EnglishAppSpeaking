import { describe, expect, it } from 'vitest';
import { evaluateConversation } from '../src/lib/ai';

describe('conversation evaluation quality gates', () => {
  it('caps score for Vietnamese off-topic answers in English speaking practice', async () => {
    const evaluation = await evaluateConversation({
      topicTitle: 'Ordering Food',
      level: 'A2',
      assignmentTitle: 'Order food at a restaurant',
      assignmentInstruction: 'Ask for the menu, order a dish, ask for price, and pay.',
      minMessages: 3,
      durationSec: 240,
      userMessages: [
        'Hôm nay tôi đi chơi với bạn và trời mưa quá.',
        'Tôi không muốn nói về nhà hàng, tôi thích bóng đá hơn.',
        'Cái này không liên quan nhưng tôi vẫn nói tiếp bằng tiếng Việt.',
      ],
      assistantMessages: ['...', '...', '...'],
      correctionCount: 0,
    });

    expect(evaluation.tooMuchVietnamese).toBe(true);
    expect(evaluation.overallScore).toBeLessThanOrEqual(55);
    expect(evaluation.taskScore).toBeLessThanOrEqual(55);
    expect(evaluation.improvements.join(' ')).toContain('tiếng Việt');
  });
});
