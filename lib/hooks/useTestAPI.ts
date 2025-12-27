import { useCallback } from 'react';

interface CreateTestPayload {
  userId: string;
  subjects: number[];
  topics: number[];
  questionCount: number;
  testMode: 'TUTOR' | 'TIMED';
  questionMode: 'STANDARD' | 'CUSTOM' | 'PRACTICE';
  useAI: boolean;
}

interface SubmitAnswerPayload {
  userId: string;
  testId: string;
  questionId: string;
  selectedOptionId?: string;
  timeSpent?: number;
}

export const useTestAPI = () => {
  const createTest = useCallback(async (payload: CreateTestPayload) => {
    try {
      const response = await fetch('/api/tests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create test');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating test:', error);
      throw error;
    }
  }, []);

  const submitAnswer = useCallback(async (payload: SubmitAnswerPayload) => {
    try {
      const response = await fetch('/api/tests/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit answer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }, []);

  return {
    createTest,
    submitAnswer,
  };
};
