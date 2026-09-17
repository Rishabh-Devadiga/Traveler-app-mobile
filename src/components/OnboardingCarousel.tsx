import type { OnboardingSlide } from '../types';

interface OnboardingCarouselProps {
  slides: OnboardingSlide[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Presentational cinematic background carousel + indicators.
 * Converted from `home_explore_illustrated_india_carousel/code.html`.
 * Slide data comes from props (centralized mock), autoplay lives in the page.
 */
export default function OnboardingCarousel({ slides, activeIndex, onSelect }: OnboardingCarouselProps) {
  const active = slides[activeIndex] ?? slides[0];

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full select-none overflow-hidden"
      >
        {slides.map((slide, index) => (
          <img
            key={slide.id}
            src={slide.imageUrl}
            alt=""
            loading={index === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1800ms] ease-in-out motion-reduce:transition-none ${
              index === activeIndex ? 'opacity-100' : 'opacity-0'
            } motion-reduce:first:opacity-100 motion-reduce:[&:not(:first-child)]:hidden`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/85 backdrop-blur-[0.5px]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
      </div>

      <div
        aria-label="Destination indicator"
        className="flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 backdrop-blur-md"
      >
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Slide ${index + 1}: ${slide.name}`}
            aria-current={index === activeIndex}
            onClick={() => onSelect(index)}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? 'scale-110 bg-white ring-2 ring-white/40'
                : 'bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
        <span className="ml-1.5 text-[11px] font-semibold tracking-tight text-white/90 transition-opacity duration-300">
          {active.name}
        </span>
      </div>
    </>
  );
}
