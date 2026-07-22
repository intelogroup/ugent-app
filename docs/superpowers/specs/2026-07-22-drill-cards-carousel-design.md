# Drill Cards Carousel — Design

## Context
`components/strategy/MemorizeTab.tsx` (rendered as `FlashcardsTab` in `app/strategy/page.tsx`) currently shows a click-to-flip card grid for two sub-tabs: Active Question Bank Clues (qbank) and Curated Concept Pairs (concepts). User feedback: this is repeated-testing/drill behavior, not a quick-glance flashcard UI, and they want the browsing behavior changed to a single-card swipe carousel (Tinder-style navigation), plus a label rename.

## Rename
- Tab button label: "Flashcards" → "Drill Cards" (`app/strategy/page.tsx` line ~106).
- Subtitle copy: "...reinforce them with flashcards." → "...reinforce them with drill cards." (line ~80).
- No change to internal identifiers: `FlashcardsTab` component name, `FLASHCARD_STORAGE_KEY`, `LEGACY_MASTERY_STORAGE_KEY`, `StrategyView` type value `"flashcards"` stay as-is (pure internal naming, out of scope, no user-visible impact, avoids needless churn).

## Carousel behavior
Replaces the `grid` rendering block for both qbank and concepts sub-tabs (`MemorizeTab.tsx` lines ~297-636) with a single-card view.

- Index state: `const [cardIndex, setCardIndex] = useState(0)`, one index shared conceptually but naturally scoped per sub-tab's active filtered list (reset on tab/filter/search change — see below).
- Active list = `filteredQBank` or `filteredConcepts` (unchanged filtering/search logic).
- Card shown: `activeList[cardIndex]`. If `activeList.length === 0`, keep existing empty-state message.
- Tap card body → toggles reveal via existing `toggleReveal(card.id)` / `revealedIds` state (unchanged reveal/back-side markup, just rendering one card instead of `.map`).
- Mastered toggle: same checkmark icon/button in the card header, same `toggleMastered` handler — unaffected by swipe direction.
- Navigation:
  - Right swipe or right-arrow button → `cardIndex + 1`, clamped to `activeList.length - 1`.
  - Left swipe or left-arrow button → `cardIndex - 1`, clamped to `0`.
  - No wraparound, no shuffle, no requeue of skipped/unmastered cards — deck order is just the filtered list's natural order.
- Swipe implementation: hand-rolled pointer events (`onPointerDown/Move/Up`) driving a `translateX` + small rotation CSS transform on the card during drag; release past a threshold (~80px) commits the index change with the same clamp logic as the arrow buttons, otherwise snaps back to center. No new npm dependency (framer-motion/react-swipeable not installed in repo, and this interaction is simple enough for raw pointer events + CSS transform).
- Arrow buttons (left/right chevrons) rendered beside/below the card as the non-drag affordance and for accessibility (keyboard/click).
- Position indicator under the card: `"{cardIndex + 1} / {activeList.length}"`.
- Reset `cardIndex` to `0` whenever `subTab`, `selectedSystem`, `searchQuery`, or `showMastered` changes (existing `useEffect`/handlers extended), preventing an out-of-range index after the filtered list shrinks.

## Out of scope
- No shuffle or spaced-repetition requeueing of unmastered cards.
- No new dependency.
- No change to mastered/progress calculation logic, storage keys, or the qbank/concepts data shape.
