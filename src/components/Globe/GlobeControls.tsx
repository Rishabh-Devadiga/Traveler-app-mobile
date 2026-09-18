import type { GlobeControlsProps } from './types';

export default function GlobeControls({
  onZoomIn,
  onZoomOut,
  rotating,
  onToggleRotate,
  onReset,
}: GlobeControlsProps) {
  return (
    <div
      className="absolute right-3 top-1/4 z-20 flex flex-col gap-2.5 items-center select-none"
      role="toolbar"
      aria-label="Globe navigation controls"
    >
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Zoom In"
        title="Zoom In"
        className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-[#D4AF37]/60 bg-[#0D172E]/90 text-xl font-bold text-[#FFD700] shadow-lg backdrop-blur-sm transition-all duration-150 hover:bg-[#16274E] hover:border-[#FFD700] active:scale-95"
      >
        ＋
      </button>

      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Zoom Out"
        title="Zoom Out"
        className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-[#D4AF37]/60 bg-[#0D172E]/90 text-xl font-bold text-[#FFD700] shadow-lg backdrop-blur-sm transition-all duration-150 hover:bg-[#16274E] hover:border-[#FFD700] active:scale-95"
      >
        －
      </button>

      <button
        type="button"
        onClick={onToggleRotate}
        aria-label={rotating ? 'Pause Auto-Rotation' : 'Start Auto-Rotation'}
        title={rotating ? 'Pause Rotation' : 'Auto Rotate'}
        className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-[#D4AF37]/60 bg-[#0D172E]/90 text-base font-bold text-[#FFD700] shadow-lg backdrop-blur-sm transition-all duration-150 hover:bg-[#16274E] hover:border-[#FFD700] active:scale-95"
      >
        {rotating ? '⏸' : '▶'}
      </button>

      <button
        type="button"
        onClick={onReset}
        aria-label="Reset to India View"
        title="Reset to India View"
        className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-[#D4AF37]/90 bg-[#142446]/95 text-xl font-extrabold text-[#FFD700] shadow-lg backdrop-blur-sm transition-all duration-150 hover:bg-[#1d3568] hover:border-[#FFD700] active:scale-95"
      >
        ⟲
      </button>
    </div>
  );
}
