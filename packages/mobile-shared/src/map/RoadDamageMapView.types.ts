import type { Report } from '../roadDamageTypes';

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type RoadDamageMapHandle = {
  animateToRegion: (region: MapRegion, duration?: number) => void;
};

export type RoadDamageMarkerTone = {
  borderColor?: string;
  accentColor?: string;
  selectedBorderColor?: string;
  selectedAccentColor?: string;
};

export type RoadDamageMapViewProps = {
  reports: Report[];
  region: MapRegion;
  selectedReportId?: string | null;
  showsUserLocation: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  onRegionChangeComplete: (region: MapRegion) => void;
  onSelectReport: (report: Report) => void;
  onMapPanDrag?: () => void;
  getMarkerTone?: (report: Report) => RoadDamageMarkerTone | null | undefined;
  getPopupStatusLabel?: (report: Report) => string | null | undefined;
  popupActionLabel?: string;
  customMapStyle?: any[];
  userInterfaceStyle?: 'light' | 'dark';
};
