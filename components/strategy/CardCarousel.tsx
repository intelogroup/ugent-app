'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

type Props<T> = {
  items: T[];
  keyFn: (item: T) => string;
  renderCard: (item: T, dragX: number) => React.ReactNode;
  onCardClick?: (item: T, wasDrag: boolean) => void;
  maxWidthClassName?: string;
  resetKey?: unknown;
};

export default function CardCarousel<T>({
  items,
  keyFn,
  renderCard,
  onCardClick,
  maxWidthClassName = 'max-w-xl',
  resetKey,
}: Props<T>) {
  const [cardIndex, setCardIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const wasDrag = useRef(false);

  useEffect(() => {
    setCardIndex(0);
  }, [resetKey]);

  if (items.length === 0) return null;

  const currentItem = items[cardIndex];

  const goNext = () => setCardIndex((i) => Math.min(i + 1, items.length - 1));
  const goPrev = () => setCardIndex((i) => Math.max(i - 1, 0));

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    setDragX(e.clientX - dragStartX.current);
  };

  const handlePointerUp = () => {
    const SWIPE_THRESHOLD = 80;
    wasDrag.current = Math.abs(dragX) > 5;
    if (dragX > SWIPE_THRESHOLD) {
      goPrev();
    } else if (dragX < -SWIPE_THRESHOLD) {
      goNext();
    }
    dragStartX.current = null;
    setDragX(0);
  };

  const handleClick = () => {
    if (wasDrag.current) {
      wasDrag.current = false;
      return;
    }
    onCardClick?.(currentItem, false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`flex items-center gap-4 w-full ${maxWidthClassName}`}>
        <button
          onClick={goPrev}
          disabled={cardIndex === 0}
          className="p-2 rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous card"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>

        <div
          key={keyFn(currentItem)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={handleClick}
          style={{
            transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
            // eslint-disable-next-line react-hooks/rules-of-hooks
            transition: dragStartX.current === null ? undefined : 'none',
          }}
          className="flex-1 cursor-grab active:cursor-grabbing select-none transition-transform duration-150"
        >
          {renderCard(currentItem, dragX)}
        </div>

        <button
          onClick={goNext}
          disabled={cardIndex === items.length - 1}
          className="p-2 rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next card"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      <span className="text-xs font-semibold text-neutral-400">
        {cardIndex + 1} / {items.length}
      </span>
    </div>
  );
}
