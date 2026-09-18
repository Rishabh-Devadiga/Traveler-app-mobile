import { useState, useEffect } from 'react';
import type { DestinationInfoCardProps } from './types';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80';

export default function DestinationInfoCard({
  destination,
  onClose,
  onExplore,
}: DestinationInfoCardProps) {
  const [imgSrc, setImgSrc] = useState(destination?.image || FALLBACK_IMAGE);

  useEffect(() => {
    if (destination?.image) {
      setImgSrc(destination.image);
    } else {
      setImgSrc(FALLBACK_IMAGE);
    }
  }, [destination]);

  if (!destination) return null;

  return (
    <div className="absolute inset-x-3 bottom-3 z-30 max-h-[340px] select-none animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="relative flex max-h-[340px] flex-col overflow-hidden rounded-2xl border-[1.5px] border-[#D4AF37]/60 bg-[#0A1224]/95 text-white shadow-2xl backdrop-blur-md">
        {/* Dismiss button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close destination details"
          className="absolute right-3 top-3 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/60 text-sm font-bold text-white transition-colors hover:bg-black/80 active:scale-95"
        >
          ✕
        </button>

        <div className="overflow-y-auto p-3.5 space-y-2.5 max-h-[330px] overscroll-contain">
          {/* Destination Photograph */}
          <div className="relative h-32 w-full overflow-hidden rounded-xl bg-[#0c162b]">
            <img
              src={imgSrc}
              alt={destination.name}
              onError={() => setImgSrc(FALLBACK_IMAGE)}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {destination.category && (
              <span className="absolute bottom-2 left-2 rounded-md border border-[#D4AF37] bg-[#0D172E]/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFD700]">
                {destination.category}
              </span>
            )}
          </div>

          {/* Title & Location */}
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-white leading-tight">
              {destination.name}
            </h3>
            <p className="mt-0.5 text-xs font-semibold text-[#D4AF37]">
              📍 {destination.city}{destination.state ? `, ${destination.state}` : ''}
            </p>
          </div>

          {/* Short Description */}
          {destination.shortDescription && (
            <p className="text-xs leading-relaxed text-[#B6C8E6]">
              {destination.shortDescription}
            </p>
          )}

          {/* Best Time to Visit */}
          {destination.bestTime && (
            <div className="rounded-lg border-l-[3px] border-[#D4AF37] bg-[#152344]/60 px-2.5 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8EA4C8]">
                Best Time to Visit
              </span>
              <p className="text-xs font-semibold text-[#EAF0FC]">
                🗓️ {destination.bestTime}
              </p>
            </div>
          )}

          {/* Highlights */}
          {destination.highlights && destination.highlights.length > 0 && (
            <div className="pt-1">
              <p className="text-[11px] font-bold tracking-wide text-[#D4AF37] mb-1">
                Highlights
              </p>
              <ul className="space-y-1 text-xs text-[#CFDDF5]">
                {destination.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-[#FFD700] text-xs leading-4">•</span>
                    <span className="leading-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action button */}
          <button
            type="button"
            onClick={() => onExplore?.(destination)}
            className="w-full rounded-xl bg-[#D4AF37] py-2.5 text-center text-xs font-extrabold text-[#080E1C] tracking-wide shadow-md transition-all duration-150 hover:bg-[#E5C058] active:scale-[0.98]"
          >
            Plan Trip to {destination.name}
          </button>
        </div>
      </div>
    </div>
  );
}
