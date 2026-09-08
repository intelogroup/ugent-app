/**
 * lib/drill-feedback-store.ts
 *
 * Shared, dependency-free write-through for Strategy Hub drill-card feedback.
 * Supabase is canonical; localStorage is an offline cache. Both paths exist so
 * an interaction never blocks the UI: the fetch is fire-and-forget and failures
 * are swallowed (the local state already reflects the click).
 *
 * Used by components/strategy/MemorizeTab.tsx for every flag/like/mastered/
 * comment + last-position write. Kept separate from the React component so the
 * sync contract is unit-testable and can't drift.
 */

export type DrillFeedbackPatch = {
  cardId: string;
  cardType?: 'qbank' | 'concept';
  flagged?: boolean;
  liked?: boolean;
  mastered?: boolean;
  comment?: string;
};

export type DrillStatePatch = {
  lastQbankCardId?: string;
  lastConceptCardId?: string;
  lastSubtab?: 'qbank' | 'concepts';
};

function post(path: string, body: unknown): void {
  if (typeof fetch !== 'function') return;
  fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

/**
 * Persist one card's feedback. Partial updates are merged server-side
 * (app/api/drill-feedback/route.ts reads the existing row first), so a call
 * carrying only {flagged:true} leaves liked/mastered/comment untouched.
 * An all-false/empty payload deletes the row instead of storing a dead row.
 */
export function syncFeedback(patch: DrillFeedbackPatch): void {
  if (!patch?.cardId) return;
  post('/api/drill-feedback', {
    cardId: patch.cardId,
    cardType: patch.cardType ?? (patch.cardId.startsWith('concept-') ? 'concept' : 'qbank'),
    flagged: patch.flagged,
    liked: patch.liked,
    mastered: patch.mastered,
    comment: patch.comment,
  });
}

/**
 * Persist last-viewed card position for relog resume. Fields are merged
 * server-side (app/api/drill-state/route.ts), so updating the qbank position
 * does not wipe the concept position.
 */
export function syncState(patch: DrillStatePatch): void {
  post('/api/drill-state', {
    lastQbankCardId: patch.lastQbankCardId,
    lastConceptCardId: patch.lastConceptCardId,
    lastSubtab: patch.lastSubtab,
  });
}