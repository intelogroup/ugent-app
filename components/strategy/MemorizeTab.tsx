'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { CheckCircleIcon as CheckCircleIconSolid, CheckIcon } from '@heroicons/react/24/solid';

type QuestionBankClue = {
  id: string;
  diseaseName: string;
  topicType: string;
  system: string;
  clues: string[];
  discriminators: string[];
};

type Pair = {
  a: string;
  b: string;
  c?: string;
  test: string;
  exAD?: string[];
  exAR?: string[];
  exXLR?: string[];
  exXLD?: string[];
  examples?: string[];
  discriminator: string;
  disorders?: { name: string; gene?: string; hit?: string; cancers?: string; cancer?: string }[];
};

type GeneticsTopic = {
  topic: string;
  pairs: Pair[];
};

type Props = {
  geneticsPairs: GeneticsTopic[];
  questionBankClues: QuestionBankClue[];
};

const FLASHCARD_STORAGE_KEY = 'ugent-flashcards-mastered';
const LEGACY_MASTERY_STORAGE_KEY = 'ugent-memorize-mastered';

export default function FlashcardsTab({ geneticsPairs, questionBankClues }: Props) {
  const [subTab, setSubTab] = useState<'qbank' | 'concepts'>('qbank');
  const [selectedSystem, setSelectedSystem] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showMastered, setShowMastered] = useState<boolean>(true);
  const [cardMode, setCardMode] = useState<'clues-first' | 'disease-first'>('clues-first');

  // Track mastered card IDs in localStorage
  const [masteredIds, setMasteredIds] = useState<string[]>([]);
  // Keep track of which cards are currently flipped/revealed in local state
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  // Carousel state
  const [cardIndex, setCardIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const dragStartX = useRef<number | null>(null);

  useEffect(() => {
    setCardIndex(0);
  }, [subTab, selectedSystem, searchQuery, showMastered]);

  useEffect(() => {
    const saved = localStorage.getItem(FLASHCARD_STORAGE_KEY)
      ?? localStorage.getItem(LEGACY_MASTERY_STORAGE_KEY);
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMasteredIds(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveMastered = (ids: string[]) => {
    setMasteredIds(ids);
    localStorage.setItem(FLASHCARD_STORAGE_KEY, JSON.stringify(ids));
  };

  const toggleMastered = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (masteredIds.includes(id)) {
      saveMastered(masteredIds.filter((item) => item !== id));
    } else {
      saveMastered([...masteredIds, id]);
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const resetAllReveals = () => {
    setRevealedIds({});
  };

  // Systems lists for filtering
  const allSystems = useMemo(() => {
    const systems = new Set<string>();
    questionBankClues.forEach((q) => {
      if (q.system) systems.add(q.system);
    });
    return ['All', ...Array.from(systems).sort()];
  }, [questionBankClues]);

  // Filter dynamic QBank clues
  const filteredQBank = useMemo(() => {
    return questionBankClues.filter((q) => {
      const systemMatch = selectedSystem === 'All' || q.system === selectedSystem;
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = q.diseaseName.toLowerCase().includes(searchLower);
      const clueMatch = q.clues.some((c) => c.toLowerCase().includes(searchLower));
      const trapMatch = q.discriminators.some((d) => d.toLowerCase().includes(searchLower));
      const typeMatch = q.topicType.toLowerCase().includes(searchLower);
      const isMastered = masteredIds.includes(q.id);

      return systemMatch && (nameMatch || clueMatch || trapMatch || typeMatch) && (showMastered || !isMastered);
    });
  }, [questionBankClues, selectedSystem, searchQuery, showMastered, masteredIds]);

  // Flatten genetics concept pairs for a card-like experience
  const flatConcepts = useMemo(() => {
    const list: (Pair & { id: string; category: string })[] = [];
    geneticsPairs.forEach((topic) => {
      topic.pairs.forEach((pair, idx) => {
        list.push({
          ...pair,
          id: `concept-${topic.topic.replace(/\s+/g, '-').toLowerCase()}-${idx}`,
          category: topic.topic,
        });
      });
    });
    return list;
  }, [geneticsPairs]);

  // Filter curated concept pairs
  const filteredConcepts = useMemo(() => {
    return flatConcepts.filter((c) => {
      const searchLower = searchQuery.toLowerCase();
      const catMatch = c.category.toLowerCase().includes(searchLower);
      const textMatch =
        c.a.toLowerCase().includes(searchLower) ||
        c.b.toLowerCase().includes(searchLower) ||
        c.test.toLowerCase().includes(searchLower) ||
        c.discriminator.toLowerCase().includes(searchLower);
      const isMastered = masteredIds.includes(c.id);

      // System filter: since curated pairs are all Genetics, only show if system is 'All' or 'Genetics'
      const systemMatch = selectedSystem === 'All' || selectedSystem === 'Genetics';

      return systemMatch && (catMatch || textMatch) && (showMastered || !isMastered);
    });
  }, [flatConcepts, selectedSystem, searchQuery, showMastered, masteredIds]);

  // Progress Calculations
  const qbankTotal = questionBankClues.length;
  const qbankMastered = questionBankClues.filter((q) => masteredIds.includes(q.id)).length;
  const conceptsTotal = flatConcepts.length;
  const conceptsMastered = flatConcepts.filter((c) => masteredIds.includes(c.id)).length;

  const activeTotal = subTab === 'qbank' ? qbankTotal : conceptsTotal;
  const activeMastered = subTab === 'qbank' ? qbankMastered : conceptsMastered;
  const percentComplete = activeTotal > 0 ? Math.round((activeMastered / activeTotal) * 100) : 0;

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

  return (
    <div className="space-y-6">
      {/* Tab Selectors & Progress Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Toggle buttons */}
        <div className="md:col-span-2 flex bg-neutral-100 rounded-lg p-1 gap-1 w-full max-w-md">
          <button
            onClick={() => {
              setSubTab('qbank');
              resetAllReveals();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-md transition-all ${
              subTab === 'qbank'
                ? 'bg-white text-neutral-900 shadow-sm border-neutral-200'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <SparklesIcon className="w-4 h-4" />
            Active Question Bank Clues
            <span className="ml-1 bg-neutral-200 text-neutral-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {qbankMastered}/{qbankTotal}
            </span>
          </button>
          <button
            onClick={() => {
              setSubTab('concepts');
              resetAllReveals();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-md transition-all ${
              subTab === 'concepts'
                ? 'bg-white text-neutral-900 shadow-sm border-neutral-200'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <BookOpenIcon className="w-4 h-4" />
            Curated Concept Pairs
            <span className="ml-1 bg-neutral-200 text-neutral-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {conceptsMastered}/{conceptsTotal}
            </span>
          </button>
        </div>

        {/* Progress Bar Card */}
        <div className="card p-3 flex flex-col justify-center bg-white border border-neutral-200 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
              Mastery Progress ({subTab === 'qbank' ? 'QBank' : 'Concepts'})
            </span>
            <span className="text-xs font-bold text-neutral-800">{percentComplete}%</span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between border border-neutral-200 shadow-sm">
        {/* Left filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* System select pill */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5">
            <FunnelIcon className="w-3.5 h-3.5" />
            <span>System:</span>
            <select
              value={selectedSystem}
              onChange={(e) => setSelectedSystem(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-neutral-800 font-semibold cursor-pointer"
            >
              {allSystems.map((sys) => (
                <option key={sys} value={sys}>
                  {sys}
                </option>
              ))}
            </select>
          </div>

          {/* Mastered Filter toggle */}
          <button
            onClick={() => setShowMastered(!showMastered)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              showMastered
                ? 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                : 'bg-primary-50 text-primary-700 border-primary-200'
            }`}
          >
            <CheckCircleIcon className="w-3.5 h-3.5" />
            {showMastered ? 'Showing All Cards' : 'Hiding Mastered'}
          </button>

          {/* Card study mode toggle (only for QBank clues) */}
          {subTab === 'qbank' && (
            <div className="flex bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
              <button
                onClick={() => setCardMode('clues-first')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  cardMode === 'clues-first' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Clues First
              </button>
              <button
                onClick={() => setCardMode('disease-first')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  cardMode === 'disease-first' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Disease First
              </button>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs md:max-w-md">
          <MagnifyingGlassIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={subTab === 'qbank' ? "Search diseases, clues, traps..." : "Search genetics topics, genes, differentiators..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
          />
        </div>
      </div>

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
