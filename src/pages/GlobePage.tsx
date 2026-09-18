import { useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobeView from '../components/Globe/GlobeView';
import GlobeControls from '../components/Globe/GlobeControls';
import DestinationChips from '../components/Globe/DestinationChips';
import DestinationInfoCard from '../components/Globe/DestinationInfoCard';
import { DESTINATIONS } from '../data/destinations';
import type { GlobeRef, GlobeDestination } from '../components/Globe/types';

export default function GlobePage() {
  const navigate = useNavigate();
  const globeRef = useRef<GlobeRef>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [webWarn, setWebWarn] = useState<string | null>(null);

  const selectedDestination = useMemo(() => {
    if (!selectedId) return null;
    return DESTINATIONS.find((d) => d.id === selectedId) || null;
  }, [selectedId]);

  const handleSelectDestination = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleChipSelect = useCallback((destination: GlobeDestination) => {
    setSelectedId(destination.id);
    if (globeRef.current) {
      globeRef.current.flyTo(
        destination.latitude,
        destination.longitude,
        destination.id
      );
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    globeRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    globeRef.current?.zoomOut();
  }, []);

  const handleToggleRotate = useCallback(() => {
    globeRef.current?.toggleRotate();
  }, []);

  const handleReset = useCallback(() => {
    setSelectedId(null);
    globeRef.current?.resetView();
  }, []);

  const handleExplore = useCallback(
    (destination: GlobeDestination) => {
      // Connect to existing Traveler planning workflow with canonical destination name
      const canonicalName =
        destination.id === 'taj-mahal' || destination.city === 'Agra'
          ? 'Agra'
          : destination.id === 'mysuru-palace' || destination.city === 'Mysuru'
          ? 'Mysuru'
          : destination.name.includes('(')
          ? destination.name.split('(')[0].trim()
          : destination.name;
      navigate('/plan', { state: { destination: canonicalName, source: 'globe' } });
    },
    [navigate]
  );

  return (
    <div className="relative flex flex-col h-[calc(100dvh-4rem)] w-full overflow-hidden bg-[#050B18] select-none">
      {/* 3D Globe Rendering View */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <GlobeView
          ref={globeRef}
          mode="full"
          destinations={DESTINATIONS}
          selectedId={selectedId}
          onSelectDestination={handleSelectDestination}
          onDeselect={handleDeselect}
          onRotateChange={setRotating}
          onError={setWebError}
          onWarn={setWebWarn}
        />

        {/* Floating Zoom & Camera Action Controls */}
        <GlobeControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          rotating={rotating}
          onToggleRotate={handleToggleRotate}
          onReset={handleReset}
        />

        {/* Error Banner */}
        {webError && (
          <div className="pointer-events-none absolute left-3 right-3 top-3 z-30 rounded-xl border border-red-500/60 bg-red-950/90 p-2.5 text-xs text-red-200">
            ⚠️ {webError}
          </div>
        )}

        {/* Warning Banner */}
        {webWarn && !webError && (
          <div className="pointer-events-none absolute left-3 right-3 top-3 z-30 rounded-xl border border-[#D4AF37]/50 bg-[#1A1806]/90 px-3 py-1.5 text-xs text-[#FFD700]">
            ℹ️ {webWarn}
          </div>
        )}

        {/* Floating Destination Info Card */}
        {selectedDestination && (
          <DestinationInfoCard
            destination={selectedDestination}
            onClose={handleDeselect}
            onExplore={handleExplore}
          />
        )}
      </div>

      {/* Quick-Jump Destination Chips at the Bottom (above bottom nav) */}
      <div className="relative z-20 border-t border-[#D4AF37]/20 bg-[#050B18]/90 backdrop-blur-sm pb-16">
        <DestinationChips
          destinations={DESTINATIONS}
          selectedId={selectedId}
          onSelect={handleChipSelect}
        />
      </div>
    </div>
  );
}
