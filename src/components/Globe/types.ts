export interface GlobeDestination {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  tier: number;
  category: string;
  image: string;
  shortDescription: string;
  bestTime: string;
  highlights: string[];
}

export interface StateCentroid {
  name: string;
  lng: number;
  lat: number;
}

export type ArcPoint = [number, number];
export type Arc = ArcPoint[];

export interface GlobeRef {
  zoomIn: () => void;
  zoomOut: () => void;
  toggleRotate: () => void;
  resetView: () => void;
  flyTo: (lat: number, lng: number, id?: string) => void;
  selectById: (id: string) => void;
}

export type GlobeMode = 'preview' | 'full';

export interface GlobeViewProps {
  mode?: GlobeMode;
  destinations?: GlobeDestination[];
  selectedId?: string | null;
  onSelectDestination?: (id: string) => void;
  onDeselect?: () => void;
  onRotateChange?: (rotating: boolean) => void;
  onError?: (msg: string) => void;
  onWarn?: (msg: string) => void;
  onClickPreview?: () => void;
  height?: number | string;
  className?: string;
}

export interface GlobeControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  rotating: boolean;
  onToggleRotate: () => void;
  onReset: () => void;
}

export interface DestinationInfoCardProps {
  destination: GlobeDestination | null;
  onClose: () => void;
  onExplore?: (destination: GlobeDestination) => void;
}

export interface DestinationChipsProps {
  destinations: GlobeDestination[];
  selectedId: string | null;
  onSelect: (destination: GlobeDestination) => void;
}
