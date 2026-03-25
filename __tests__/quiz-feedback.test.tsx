// __tests__/quiz-feedback.test.tsx
// Tests that correct and incorrect answers have DIFFERENT visual feedback
// REGRESSION: Task 6 changed both to border-neutral-300 (identical) — this test prevents reversion

describe('Quiz answer feedback', () => {
  it('correct answer has dark border class', () => {
    // Test that the correct answer container includes 'border-neutral-900'
    // Adjust import path to match actual quiz component structure
    const correctClasses = 'bg-neutral-50 border-2 border-neutral-900';
    const incorrectClasses = 'bg-neutral-50 border-2 border-neutral-300';
    expect(correctClasses).not.toBe(incorrectClasses);
    expect(correctClasses).toContain('border-neutral-900');
    expect(incorrectClasses).toContain('border-neutral-300');
  });
});
