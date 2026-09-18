import { useRef, useEffect } from 'react';
import type { DestinationChipsProps } from './types';

export default function DestinationChips({
  destinations,
  selectedId,
  onSelect,
}: DestinationChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected chip into view
  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    const activeChip = scrollRef.current.querySelector<HTMLButtonElement>(
      `[data-chip-id="${selectedId}"]`
    );
    if (activeChip) {
      activeChip.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedId]);

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar flex w-full gap-2 overflow-x-auto px-3 py-2 select-none"
      role="tablist"
      aria-label="Quick jump destination chips"
    >
      {destinations.map((d) => {
        const isSelected = selectedId === d.id;
        return (
          <button
            key={d.id}
            data-chip-id={d.id}
            type="button"
            onClick={() => onSelect(d)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-150 ${
              isSelected
                ? 'bg-[#D4AF37] text-[#0A1224] font-bold shadow-md shadow-[#D4AF37]/30 scale-105'
                : 'border border-[#8FA3C8]/30 bg-[#101C38]/90 text-[#CFD9EE] hover:bg-[#16274E] hover:border-[#D4AF37]/50 active:scale-95'
            }`}
          >
            {d.name}
          </button>
        );
      })}
    </div>
  );
}
