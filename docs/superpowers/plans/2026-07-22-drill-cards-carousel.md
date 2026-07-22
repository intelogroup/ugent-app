# Drill Cards Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the Strategy Hub "Flashcards" tab to "Drill Cards" and replace its card grid with a single-card swipe carousel (Tinder-style left/right navigation) for both the QBank clues and Concept pairs sub-tabs.

**Architecture:** `app/strategy/page.tsx` gets copy-only edits (button label, subtitle). `components/strategy/MemorizeTab.tsx` keeps all existing state/filtering/reveal/mastered logic unchanged and swaps only the rendering of `filteredQBank`/`filteredConcepts` from a `.map()` grid to a single active card at `cardIndex`, driven by pointer-event drag plus arrow buttons.

**Tech Stack:** Next.js 16 / React 19, Tailwind v4, Heroicons (`@heroicons/react`) — no new dependency. Manual pointer events for drag (no framer-motion/react-swipeable in repo, per spec).

## Global Constraints

- No new npm dependency — swipe drag implemented with native pointer events + CSS transform.
- No wraparound, no shuffle, no requeue of skipped/unmastered cards — deck order is the existing filtered list order.
- Swipe drag commit threshold: 80px horizontal.
- Reset `cardIndex` to 0 whenever `subTab`, `selectedSystem`, `searchQuery`, or `showMastered` changes.
- Internal identifiers (`FlashcardsTab` component name, `FLASHCARD_STORAGE_KEY`, `LEGACY_MASTERY_STORAGE_KEY`, `StrategyView` type value `"flashcards"`) stay unchanged — rename is UI copy only.
- No test framework is set up for `components/strategy/*` today (verified: no existing `*.test.*` files under `components/strategy`) — verification for this plan is manual browser testing per task, not new unit tests, consistent with existing project convention for this directory.

---

### Task 1: Rename UI copy ("Flashcards" → "Drill Cards")

**Files:**
- Modify: `app/strategy/page.tsx:80` (subtitle), `app/strategy/page.tsx:106` (tab button label)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks (pure copy change, independent of Task 2).

- [ ] **Step 1: Update subtitle copy**

In `app/strategy/page.tsx`, line 80, change:

```tsx
Explore relationships in your question bank and reinforce them with flashcards.
```

to:

```tsx
Explore relationships in your question bank and reinforce them with drill cards.
```

- [ ] **Step 2: Update tab button label**

In `app/strategy/page.tsx`, line 106, change:

```tsx
Flashcards
```

to:

```tsx
Drill Cards
```

(Leave the surrounding `<button onClick={() => setView("flashcards")} ...>` and the `StrategyView` type's `"flashcards"` value untouched — internal identifier, not user-visible copy.)

- [ ] **Step 3: Verify in browser**

Run: `npm run dev` (skip if already running), open `http://localhost:3000/strategy`.
Expected: subtitle reads "...reinforce them with drill cards.", second tab button reads "Drill Cards" instead of "Flashcards". Clicking it still switches to the same view as before.

- [ ] **Step 4: Commit**

```bash
git add app/strategy/page.tsx
git commit -m "Rename Flashcards tab to Drill Cards"
```

---

### Task 2: Add carousel state and navigation helpers to MemorizeTab

**Files:**
- Modify: `components/strategy/MemorizeTab.tsx:50-166` (component body, state/derived-data section)

**Interfaces:**
- Consumes: existing `filteredQBank`, `filteredConcepts`, `subTab`, `selectedSystem`, `searchQuery`, `showMastered` (all defined earlier in the same file, unchanged).
- Produces (used by Task 3's rendering):
  - `cardIndex: number` state
  - `activeList: (QuestionBankClue | (Pair & { id: string; category: string }))[]` — resolves to `filteredQBank` or `filteredConcepts` based on `subTab`
  - `goNext(): void` — advance index, clamped to `activeList.length - 1`
  - `goPrev(): void` — retreat index, clamped to `0`
  - `dragX: number` state and `setDragX` — live horizontal drag offset in px, used by Task 3 for the transform
  - `handlePointerDown(e: React.PointerEvent): void`
  - `handlePointerMove(e: React.PointerEvent): void`
  - `handlePointerUp(): void`

- [ ] **Step 1: Add carousel state**

In `components/strategy/MemorizeTab.tsx`, immediately after the existing state declarations (after line 60, `const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});`), add:

```tsx
  // Carousel state
  const [cardIndex, setCardIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const dragStartX = useRef<number | null>(null);
```

Add `useRef` to the existing React import at the top of the file (line 3):

```tsx
import { useState, useEffect, useMemo, useRef } from 'react';
```

- [ ] **Step 2: Reset cardIndex when filters change**

Immediately after the state block added in Step 1, add:

```tsx
  useEffect(() => {
    setCardIndex(0);
  }, [subTab, selectedSystem, searchQuery, showMastered]);
```

- [ ] **Step 3: Add activeList and navigation helpers**

After the existing `percentComplete` calculation (after line 166, `const percentComplete = ...`), add:

```tsx
  const activeList = subTab === 'qbank' ? filteredQBank : filteredConcepts;
  const currentCard = activeList[cardIndex];

  const goNext = () => {
    setCardIndex((i) => Math.min(i + 1, activeList.length - 1));
  };

  const goPrev = () => {
    setCardIndex((i) => Math.max(i - 1, 0));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    setDragX(e.clientX - dragStartX.current);
  };

  const handlePointerUp = () => {
    const SWIPE_THRESHOLD = 80;
    if (dragX > SWIPE_THRESHOLD) {
      goPrev();
    } else if (dragX < -SWIPE_THRESHOLD) {
      goNext();
    }
    dragStartX.current = null;
    setDragX(0);
  };
```

(Right-drag/right-swipe = "next" per the approved design; the code above maps a negative `dragX` — dragging left, revealing what's to the right — to `goNext()`, and a positive `dragX` to `goPrev()`, matching natural swipe-left-to-advance behavior used by card-deck UIs. This mirrors the arrow buttons in Task 3, which call `goNext`/`goPrev` directly by label rather than sign.)

- [ ] **Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this task (pre-existing unrelated errors, if any, are out of scope).

- [ ] **Step 5: Commit**

```bash
git add components/strategy/MemorizeTab.tsx
git commit -m "Add carousel index/drag state to MemorizeTab"
```

---

### Task 3: Replace QBank grid with single-card carousel view

**Files:**
- Modify: `components/strategy/MemorizeTab.tsx:297-442` (the `subTab === 'qbank'` render branch)

**Interfaces:**
- Consumes: `currentCard`, `activeList`, `cardIndex`, `dragX`, `goNext`, `goPrev`, `handlePointerDown`, `handlePointerMove`, `handlePointerUp` (all from Task 2), plus existing `revealedIds`, `toggleReveal`, `masteredIds`, `toggleMastered`, `cardMode` (unchanged, defined earlier in file).
- Produces: nothing new consumed elsewhere — this task's JSX is a leaf.

- [ ] **Step 1: Replace the qbank grid block**

In `components/strategy/MemorizeTab.tsx`, replace lines 297-442 (from `{/* Main Flashcard Grid */}` through the closing of the qbank grid's ternary branch, i.e. everything from `{subTab === 'qbank' ? (` up to and including the `) : (` that starts the concepts branch) with:

```tsx
      {/* Main Drill Card Carousel */}
      {subTab === 'qbank' ? (
        activeList.length === 0 ? (
          <div className="card p-12 text-center text-sm text-neutral-400 border border-neutral-200">
            No matching question bank clues found. Try clearing your filters or search query.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 w-full max-w-xl">
              <button
                onClick={goPrev}
                disabled={cardIndex === 0}
                className="p-2 rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous card"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>

              {currentCard && (() => {
                const card = currentCard as QuestionBankClue;
                const isRevealed = !!revealedIds[card.id];
                const isMastered = masteredIds.includes(card.id);

                return (
                  <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onClick={() => toggleReveal(card.id)}
                    style={{ transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)` }}
                    className={`card flex flex-col justify-between cursor-grab active:cursor-grabbing select-none flex-1 min-h-[260px] border transition-transform duration-150 ${
                      isMastered ? 'border-emerald-200 bg-emerald-50/10' : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-neutral-100 text-neutral-600">
                          {card.system}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-50 text-blue-700">
                          {card.topicType}
                        </span>
                      </div>

                      <button
                        onClick={(e) => toggleMastered(card.id, e)}
                        className="text-neutral-300 hover:text-emerald-600 transition-colors"
                        title={isMastered ? "Mark Unmastered" : "Mark Mastered"}
                      >
                        {isMastered ? (
                          <CheckCircleIconSolid className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <CheckCircleIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      {!isRevealed ? (
                        cardMode === 'clues-first' ? (
                          <div className="space-y-3">
                            <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                              Clinical Presentation
                            </span>
                            <ul className="space-y-1.5">
                              {card.clues.slice(0, 3).map((clue, idx) => (
                                <li key={idx} className="text-xs text-neutral-700 flex items-start gap-1.5 leading-relaxed">
                                  <span className="text-primary-500 mt-0.5">•</span>
                                  <span>{clue}</span>
                                </li>
                              ))}
                              {card.clues.length > 3 && (
                                <li className="text-[10px] text-neutral-400 italic">
                                  + {card.clues.length - 3} more clues...
                                </li>
                              )}
                            </ul>
                          </div>
                        ) : (
                          <div className="flex flex-col justify-center items-center h-full text-center space-y-2 py-6">
                            <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                              USMLE Target Topic
                            </span>
                            <h3 className="text-lg font-bold text-neutral-900">{card.diseaseName}</h3>
                            <span className="text-xs text-neutral-400 italic">Click to reveal high-yield facts</span>
                          </div>
                        )
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <span className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider block">
                              Diagnosis
                            </span>
                            <h3 className="text-base font-bold text-neutral-900">{card.diseaseName}</h3>
                          </div>

                          {cardMode === 'clues-first' ? (
                            card.discriminators.length > 0 && (
                              <div className="border-t border-neutral-100 pt-2">
                                <span className="text-[9px] font-bold uppercase text-rose-500 tracking-wider block mb-1">
                                  High-Yield Discriminators & Traps
                                </span>
                                <ul className="space-y-1">
                                  {card.discriminators.slice(0, 2).map((trap, idx) => (
                                    <li key={idx} className="text-[11px] text-rose-800 bg-rose-50 px-2 py-1 rounded border border-rose-100/50">
                                      {trap}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )
                          ) : (
                            <div className="border-t border-neutral-100 pt-2 space-y-2">
                              <div>
                                <span className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider block">
                                  Presentation Clues
                                </span>
                                <ul className="space-y-0.5 text-xs text-neutral-700">
                                  {card.clues.slice(0, 2).map((c, i) => (
                                    <li key={i} className="truncate">• {c}</li>
                                  ))}
                                </ul>
                              </div>
                              {card.discriminators.length > 0 && (
                                <div>
                                  <span className="text-[9px] font-bold uppercase text-rose-500 tracking-wider block">
                                    Traps
                                  </span>
                                  <p className="text-[11px] text-rose-800 italic truncate">
                                    {card.discriminators[0]}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t border-neutral-50 flex items-center justify-between text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <EyeIcon className="w-3.5 h-3.5 text-neutral-300" />
                          {isRevealed ? 'Hide details' : 'Click to flip'}
                        </span>
                        {isMastered && (
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5 text-[10px]">
                            <CheckIcon className="w-3 h-3 text-emerald-600" /> Mastered
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={goNext}
                disabled={cardIndex === activeList.length - 1}
                className="p-2 rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next card"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>

            <span className="text-xs font-semibold text-neutral-400">
              {cardIndex + 1} / {activeList.length}
            </span>
          </div>
        )
      ) : (
```

- [ ] **Step 2: Add ChevronLeftIcon/ChevronRightIcon imports**

In `components/strategy/MemorizeTab.tsx`, line 4-11, add `ChevronLeftIcon` and `ChevronRightIcon` to the existing `@heroicons/react/24/outline` import:

```tsx
import {
  CheckCircleIcon,
  SparklesIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: no new errors. (The concepts branch still references the old grid at this point — that's expected until Task 4 — so this step only confirms the qbank branch compiles cleanly.)

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev` (skip if already running), open `http://localhost:3000/strategy`, click "Drill Cards" tab, ensure "Active Question Bank Clues" sub-tab is selected.

Expected:
- One card shown at a time with "N / total" indicator below it.
- Clicking the card flips it to show the answer/discriminators; clicking again flips back.
- Right chevron button advances to next card, left chevron goes back; both disable at the ends of the list.
- Dragging the card left with mouse (press, move left ~100px, release) advances to the next card and the card visually rotates/translates during the drag.
- Dragging right goes to the previous card.
- Mastered checkmark button still toggles independently of drag/reveal.
- Changing the System filter or search resets to card 1/N.

- [ ] **Step 5: Commit**

```bash
git add components/strategy/MemorizeTab.tsx
git commit -m "Replace QBank clue grid with swipe carousel"
```

---

### Task 4: Replace Concept Pairs grid with single-card carousel view

**Files:**
- Modify: `components/strategy/MemorizeTab.tsx` (the concepts `.map()` branch, immediately following the code inserted by Task 3 — originally lines 443-636 before Task 3's edit)

**Interfaces:**
- Consumes: same helpers as Task 3 (`currentCard`, `activeList`, `cardIndex`, `dragX`, `goNext`, `goPrev`, `handlePointerDown`, `handlePointerMove`, `handlePointerUp`), plus existing `revealedIds`, `toggleReveal`, `masteredIds`, `toggleMastered` and the `Pair & { id: string; category: string }` shape.
- Produces: nothing new — leaf JSX, closes out the component's return statement.

- [ ] **Step 1: Replace the concepts grid block**

Replace the concepts branch (starting at `/* Curated Genetics & Concept Pairs tab */` through its closing `)}` before the component's final `</div>\n  );\n}`) with:

```tsx
        /* Curated Genetics & Concept Pairs tab */
        activeList.length === 0 ? (
          <div className="card p-12 text-center text-sm text-neutral-400 border border-neutral-200">
            No matching concept pairs found. Try clearing your filters or search query.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 w-full max-w-2xl">
              <button
                onClick={goPrev}
                disabled={cardIndex === 0}
                className="p-2 rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous card"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>

              {currentCard && (() => {
                const pair = currentCard as Pair & { id: string; category: string };
                const isMastered = masteredIds.includes(pair.id);
                const isRevealed = !!revealedIds[pair.id];

                return (
                  <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onClick={() => toggleReveal(pair.id)}
                    style={{ transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)` }}
                    className={`card border cursor-grab active:cursor-grabbing select-none flex-1 transition-transform duration-150 ${
                      isMastered ? 'border-emerald-200 bg-emerald-50/10' : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <div className="p-4 bg-neutral-50/50 border-b border-neutral-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-neutral-200 text-neutral-700">
                          {pair.category}
                        </span>
                        <span className="text-xs text-neutral-400">
                          Discriminator Study
                        </span>
                      </div>

                      <button
                        onClick={(e) => toggleMastered(pair.id, e)}
                        className="text-neutral-300 hover:text-emerald-600 transition-colors"
                        title={isMastered ? "Mark Unmastered" : "Mark Mastered"}
                      >
                        {isMastered ? (
                          <CheckCircleIconSolid className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <CheckCircleIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-center gap-4 flex-wrap">
                        <div className="px-4 py-2 bg-blue-50 text-blue-800 rounded-lg font-bold border border-blue-100 text-sm">
                          {pair.a}
                        </div>
                        <span className="text-neutral-400 font-bold text-xs">vs</span>
                        <div className="px-4 py-2 bg-indigo-50 text-indigo-800 rounded-lg font-bold border border-indigo-100 text-sm">
                          {pair.b}
                        </div>
                        {pair.c && (
                          <>
                            <span className="text-neutral-400 font-bold text-xs">vs</span>
                            <div className="px-4 py-2 bg-purple-50 text-purple-800 rounded-lg font-bold border border-purple-100 text-sm">
                              {pair.c}
                            </div>
                          </>
                        )}
                      </div>

                      {!isRevealed ? (
                        <div className="text-center py-3 text-xs text-neutral-400 italic">
                          Click to reveal differences and differentiating rules
                        </div>
                      ) : (
                        <div className="space-y-4 pt-3 border-t border-neutral-100">
                          <div>
                            <h4 className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider mb-1">
                              Diagnostic Contrast / High-Yield Test
                            </h4>
                            <p className="text-sm text-neutral-800 leading-relaxed bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                              {pair.test}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-bold uppercase text-rose-500 tracking-wider mb-1">
                              How to Tell Them Apart (USMLE Trap)
                            </h4>
                            <p className="text-sm text-rose-900 bg-rose-50/50 p-3 rounded-lg border border-rose-100">
                              {pair.discriminator}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pair.exAD && pair.exAD.length > 0 && (
                              <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-100">
                                <span className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider block mb-1">AD Examples</span>
                                <div className="flex flex-wrap gap-1">
                                  {pair.exAD.map((item, i) => (
                                    <span key={i} className="text-[10px] bg-white border border-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded">{item}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {pair.exAR && pair.exAR.length > 0 && (
                              <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-100">
                                <span className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider block mb-1">AR Examples</span>
                                <div className="flex flex-wrap gap-1">
                                  {pair.exAR.map((item, i) => (
                                    <span key={i} className="text-[10px] bg-white border border-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded">{item}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {pair.exXLR && pair.exXLR.length > 0 && (
                              <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-100">
                                <span className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider block mb-1">XLR Examples</span>
                                <div className="flex flex-wrap gap-1">
                                  {pair.exXLR.map((item, i) => (
                                    <span key={i} className="text-[10px] bg-white border border-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded">{item}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {pair.exXLD && pair.exXLD.length > 0 && (
                              <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-100">
                                <span className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider block mb-1">XLD Examples</span>
                                <div className="flex flex-wrap gap-1">
                                  {pair.exXLD.map((item, i) => (
                                    <span key={i} className="text-[10px] bg-white border border-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded">{item}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {pair.examples && pair.examples.length > 0 && (
                              <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-100 md:col-span-2">
                                <span className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider block mb-1">Key Examples</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {pair.examples.map((item, i) => (
                                    <span key={i} className="text-[10px] bg-white border border-neutral-200 text-neutral-700 px-2 py-0.5 rounded">{item}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {pair.disorders && pair.disorders.length > 0 && (
                              <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-100 md:col-span-2 overflow-x-auto">
                                <span className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider block mb-2">Hereditary Syndromes Breakdown</span>
                                <table className="w-full text-xs text-left">
                                  <thead>
                                    <tr className="border-b border-neutral-200 text-neutral-400 font-semibold">
                                      <th className="pb-1">Syndrome</th>
                                      <th className="pb-1">Gene/Mechanism</th>
                                      <th className="pb-1">Key Associated Cancers / Features</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {pair.disorders.map((d, i) => (
                                      <tr key={i} className="border-b border-neutral-100/50 last:border-0">
                                        <td className="py-1.5 font-bold text-neutral-800">{d.name}</td>
                                        <td className="py-1.5 text-neutral-600">{d.gene || d.hit}</td>
                                        <td className="py-1.5 text-neutral-600">{d.cancers || d.cancer}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <EyeIcon className="w-3.5 h-3.5 text-neutral-300" />
                          {isRevealed ? 'Hide details' : 'Click to expand details'}
                        </span>
                        {isMastered && (
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5 text-[10px]">
                            <CheckIcon className="w-3 h-3" /> Mastered
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={goNext}
                disabled={cardIndex === activeList.length - 1}
                className="p-2 rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next card"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>

            <span className="text-xs font-semibold text-neutral-400">
              {cardIndex + 1} / {activeList.length}
            </span>
          </div>
        )
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual browser verification**

Run: `npm run dev` (skip if already running), open `http://localhost:3000/strategy`, click "Drill Cards" tab, switch to "Curated Concept Pairs" sub-tab.

Expected:
- Single concept-pair card shown with "N / total" indicator.
- Click flips to show diagnostic contrast/discriminator/examples; click again collapses.
- Left/right chevrons and drag-swipe navigate as in Task 3, disabling at list ends.
- Mastered toggle works independently.
- Switching back to "Active Question Bank Clues" sub-tab resets to card 1 of that list.

- [ ] **Step 4: Commit**

```bash
git add components/strategy/MemorizeTab.tsx
git commit -m "Replace concept pairs grid with swipe carousel"
```

---

### Task 5: Full regression pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Run existing test suite to confirm no regression elsewhere**

Run: `npm test` (or the project's configured Jest/Vitest script — check `package.json` `"scripts"` if unsure of the exact command)
Expected: all existing tests pass, none newly broken by these changes (no new tests were added per this plan's Global Constraints).

- [ ] **Step 3: Full manual walkthrough in browser**

Run: `npm run dev` (skip if already running), open `http://localhost:3000/strategy`, "Drill Cards" tab:
- Toggle "Clues First" / "Disease First" card mode on the QBank sub-tab — confirm it still affects the currently shown card's front/back content.
- Type in the search box — confirm the list filters and index resets to card 1.
- Toggle the System filter dropdown — confirm same reset behavior.
- Toggle "Hiding Mastered" — confirm mastered cards drop out of the deck and index resets.
- Mark a card mastered, refresh the page — confirm mastered state persists (localStorage) and progress bar percentage updates.

- [ ] **Step 4: Commit (if any fixups were needed)**

```bash
git add -A
git commit -m "Fix regressions found in drill cards carousel walkthrough"
```

(Skip this step if no fixups were needed.)
