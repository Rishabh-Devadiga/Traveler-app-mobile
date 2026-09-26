import type { GlobeControlsProps } from './types';
import { PauseIcon, PlayIcon, RotateIcon, ZoomInIcon, ZoomOutIcon } from '../icons';

export default function GlobeControls({
  onZoomIn,
  onZoomOut,
  rotating,
  onToggleRotate,
  onReset,
}: GlobeControlsProps) {
  const btn = 'flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-md transition-all duration-150 hover:bg-white/20 active:scale-95';
  return (
    <div
      className="absolute right-3 top-1/4 z-20 flex select-none flex-col items-center gap-2.5"
      role="toolbar"
      aria-label="Globe navigation controls"
    >
      <button type="button" onClick={onZoomIn} aria-label="Zoom In" title="Zoom In" className={btn}>
        <ZoomInIcon size={20} />
      </button>

      <button type="button" onClick={onZoomOut} aria-label="Zoom Out" title="Zoom Out" className={btn}>
        <ZoomOutIcon size={20} />
      </button>

      <button
        type="button"
        onClick={onToggleRotate}
        aria-label={rotating ? 'Pause Auto-Rotation' : 'Start Auto-Rotation'}
        title={rotating ? 'Pause Rotation' : 'Auto Rotate'}
        className={btn}
      >
        {rotating ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
      </button>

      <button type="button" onClick={onReset} aria-label="Reset to India View" title="Reset to India View" className={btn}>
        <RotateIcon size={20} />
      </button>
    </div>
  );
}
