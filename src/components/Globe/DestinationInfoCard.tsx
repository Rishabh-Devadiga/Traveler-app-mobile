import { useState, useEffect } from 'react';
import type { DestinationInfoCardProps } from './types';
import { CalendarIcon, CloseIcon, MapPinIcon } from '../icons';

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
    <div className="absolute inset-x-3 bottom-3 z-30 select-none">
      <div className="sheet-enter relative flex max-h-[46vh] flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0A1224]/95 text-white shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close destination details"
          className="absolute right-3 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/60 text-white transition-colors hover:bg-black/80 active:scale-95"
        >
          <CloseIcon size={18} />
        </button>

        <div className="max-h-[46vh] space-y-2.5 overflow-y-auto overscroll-contain p-4">
          <div className="relative h-[140px] w-full overflow-hidden rounded-2xl bg-[#0c162b]">
            <img
              src={imgSrc}
              alt={destination.name}
              onError={() => setImgSrc(FALLBACK_IMAGE)}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {destination.category && (
              <span className="absolute bottom-2 left-2 rounded-full border border-[#D4AF37] bg-[#0D172E]/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#FFD700]">
                {destination.category}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-[18px] font-extrabold leading-tight tracking-tight text-white">
              {destination.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-[#D4AF37]">
              <MapPinIcon size={16} />
              <span>{destination.city}{destination.state ? `, ${destination.state}` : ''}</span>
            </p>
          </div>

          {destination.shortDescription && (
            <p className="clamp-2 text-[13px] leading-relaxed text-[#B6C8E6]">
              {destination.shortDescription}
            </p>
          )}

          {destination.bestTime && (
            <div className="rounded-xl border-l-[3px] border-[#D4AF37] bg-[#152344]/60 px-2.5 py-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8EA4C8]">
                Best Time to Visit
              </span>
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#EAF0FC]">
                <CalendarIcon size={16} /> {destination.bestTime}
              </p>
            </div>
          )}

          {destination.highlights && destination.highlights.length > 0 && (
            <div className="pt-1">
              <p className="mb-1 text-xs font-bold tracking-wide text-[#D4AF37]">
                Highlights
              </p>
              <ul className="space-y-1 text-[13px] text-[#CFDDF5]">
                {destination.highlights.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-xs leading-4 text-[#FFD700]">•</span>
                    <span className="leading-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => onExplore?.(destination)}
            className="min-h-[48px] w-full rounded-full bg-[#D4AF37] py-2.5 text-center text-[14px] font-extrabold tracking-wide text-[#080E1C] shadow-md transition-all duration-150 hover:bg-[#E5C058] active:scale-[0.98]"
          >
            Plan Trip to {destination.name}
          </button>
        </div>
      </div>
    </div>
  );
}
