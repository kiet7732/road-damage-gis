import type { MapRegion } from '../components/RoadDamageMapView.types';

export const DEFAULT_REGION: MapRegion = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

export const USER_REGION_DELTA = {
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

export const SELECTED_REPORT_REGION_DELTA = {
  latitudeDelta: 0.0065,
  longitudeDelta: 0.0065,
};

export const VIEWPORT_FETCH_DEBOUNCE_MS = 450;
export const MAP_LOAD_TIMEOUT_MS = 20000;
export const LOCATION_LOAD_TIMEOUT_MS = 8000;
export const MAP_VIEWPORT_LIMIT = 200;
export const STATUS_FILTERS = ['all', 'pending', 'processing', 'repaired'] as const;
export const DAMAGE_TYPE_FILTERS = ['all', 'D00', 'D10', 'D20', 'D40'] as const;

export type StatusFilterValue = (typeof STATUS_FILTERS)[number];
export type DamageTypeFilterValue = (typeof DAMAGE_TYPE_FILTERS)[number];

export const regionToBoundingBox = (region: MapRegion) => ({
  minLatitude: region.latitude - region.latitudeDelta / 2,
  maxLatitude: region.latitude + region.latitudeDelta / 2,
  minLongitude: region.longitude - region.longitudeDelta / 2,
  maxLongitude: region.longitude + region.longitudeDelta / 2,
});

const REGION_EPSILON = 0.00005;
const DELTA_EPSILON = 0.0005;

export const isSameRegion = (left: MapRegion, right: MapRegion): boolean =>
  Math.abs(left.latitude - right.latitude) < REGION_EPSILON &&
  Math.abs(left.longitude - right.longitude) < REGION_EPSILON &&
  Math.abs(left.latitudeDelta - right.latitudeDelta) < DELTA_EPSILON &&
  Math.abs(left.longitudeDelta - right.longitudeDelta) < DELTA_EPSILON;
