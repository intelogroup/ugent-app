import {
  createQuizProgress,
  recordAnswer,
  countCorrect,
  countIncorrect,
  countAnswered,
  isQuestionAnswered,
} from '@/lib/quiz-lifecycle';

describe('quiz lifecycle scoring', () => {
  it('starts empty', () => {
    const p = createQuizProgress();
    expect(countCorrect(p)).toBe(0);
    expect(countIncorrect(p)).toBe(0);
    expect(countAnswered(p)).toBe(0);
  });

  it('counts a correct answer', () => {
    const p = recordAnswer(createQuizProgress(), 'q1', true, 0);
    expect(countCorrect(p)).toBe(1);
    expect(countIncorrect(p)).toBe(0);
    expect(countAnswered(p)).toBe(1);
  });

  it('counts an incorrect answer', () => {
    const p = recordAnswer(createQuizProgress(), 'q1', false, 1);
    expect(countCorrect(p)).toBe(0);
    expect(countIncorrect(p)).toBe(1);
    expect(countAnswered(p)).toBe(1);
  });

  it('re-answering a question overwrites instead of double counting', () => {
    // Back-nav regression: answering q1 correctly, going back and changing it
    // to wrong must not leave the correct tally inflated.
    let p = recordAnswer(createQuizProgress(), 'q1', true, 0);
    expect(countCorrect(p)).toBe(1);

    p = recordAnswer(p, 'q1', false, 1);
    expect(countCorrect(p)).toBe(0);
    expect(countIncorrect(p)).toBe(1);
    expect(countAnswered(p)).toBe(1);
  });

  it('mixed answers tally correctly and order is stable', () => {
    let p = createQuizProgress();
    p = recordAnswer(p, 'q1', true, 0);
    p = recordAnswer(p, 'q2', false, 2);
    p = recordAnswer(p, 'q3', true, 3);
    expect(countCorrect(p)).toBe(2);
    expect(countIncorrect(p)).toBe(1);
    expect(countAnswered(p)).toBe(3);
  });

  it('isQuestionAnswered reflects the answer map', () => {
    const p = recordAnswer(createQuizProgress(), 'q1', true, 0);
    expect(isQuestionAnswered(p, 'q1')).toBe(true);
    expect(isQuestionAnswered(p, 'q2')).toBe(false);
  });
});
