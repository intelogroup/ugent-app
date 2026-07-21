import { useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TrackingConfig {
  testId?: string;
  questionId?: string;
  answerId?: string;
}

export const useInteractionTracking = (config: TrackingConfig) => {
  const startTimeRef = useRef<number>(0);

  const trackInteraction = useCallback(
    async (
      actionType: string,
      entityType: string,
      entityId?: string,
      metadata?: Record<string, any>
    ) => {
      const durationMs = startTimeRef.current ? Date.now() - startTimeRef.current : undefined;

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        await fetch('/api/interactions/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            actionType,
            entityType,
            entityId,
            testId: config.testId,
            questionId: config.questionId,
            answerId: config.answerId,
            metadata,
            durationMs,
          }),
        });
      } catch (error) {
        console.error('Failed to track interaction:', error);
      }
    },
    [config]
  );

  const startTracking = useCallback(() => {
    startTimeRef.current = Date.now();
  }, []);

  const endTracking = useCallback(
    (actionType: string, entityType: string, entityId?: string, metadata?: Record<string, any>) => {
      trackInteraction(actionType, entityType, entityId, metadata);
      startTimeRef.current = 0;
    },
    [trackInteraction]
  );

  return {
    trackInteraction,
    startTracking,
    endTracking,
  };
};
