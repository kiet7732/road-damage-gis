export type RoadDamageStatusKey = 'new' | 'pending' | 'processing' | 'repaired' | 'rejected';
export type RoadDamageTypeCode = 'D00' | 'D10' | 'D20' | 'D40';

export const ROAD_DAMAGE_STATUS: Record<
  RoadDamageStatusKey,
  {
    key: RoadDamageStatusKey;
    label: string;
    shortLabel: string;
    color: string;
    backgroundColor: string;
    borderColor: string;
    mobileIcon: string;
    webIcon: string;
  }
>;

export const ROAD_DAMAGE_TYPES: Record<
  RoadDamageTypeCode,
  {
    code: RoadDamageTypeCode;
    label: string;
    color: string;
    backgroundColor: string;
  }
>;

export const ROAD_DAMAGE_UI_COLORS: Record<string, string>;
export const REPORT_PUBLIC_STATUS_ALIASES: Record<string, RoadDamageStatusKey>;

export function getRoadDamageStatus(status: string): typeof ROAD_DAMAGE_STATUS[RoadDamageStatusKey];
export function normalizeRoadDamagePublicStatus(status: string): RoadDamageStatusKey;
export function getRoadDamageType(type: string): typeof ROAD_DAMAGE_TYPES[RoadDamageTypeCode];
export function getReporterProcessingUpdate(
  status: string,
): {
  title: string;
  description: string;
};
