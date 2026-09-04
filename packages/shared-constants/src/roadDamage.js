export {
  ROAD_DAMAGE_STATUS,
  REPORT_PUBLIC_STATUS_ALIASES,
  getRoadDamageStatus,
  getReporterProcessingUpdate,
  normalizeRoadDamagePublicStatus,
} from './statusRuntime.js';

export const ROAD_DAMAGE_TYPES = {
  D00: {
    code: 'D00',
    label: 'Nứt dọc',
    color: '#1677FF',
    backgroundColor: '#E8F2FF',
  },
  D10: {
    code: 'D10',
    label: 'Nứt ngang',
    color: '#C28A00',
    backgroundColor: '#FFF6D8',
  },
  D20: {
    code: 'D20',
    label: 'Nứt da cá sấu',
    color: '#E86C00',
    backgroundColor: '#FFF0DF',
  },
  D40: {
    code: 'D40',
    label: 'Ổ gà',
    color: '#C1121F',
    backgroundColor: '#FFE8E8',
  },
};

export const ROAD_DAMAGE_UI_COLORS = {
  primary: '#075DBB',
  primaryDark: '#003F87',
  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  mobileSurfaceMuted: '#F0F4FA',
  inputBackground: '#FAFBFE',
  text: '#0F172A',
  mobileText: '#1F2430',
  textMuted: '#64748B',
  mobileTextMuted: '#667085',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: '#E7ECF5',
  border: '#E2E8F0',
  mobileBorder: '#CCD3DF',
  borderSoft: '#D9E2EF',
  sidebar: '#0F172A',
  sidebarText: '#CBD5E1',
  danger: '#C1121F',
  dangerSoft: '#FFF2F2',
  dangerBorder: '#FFC2C2',
  cameraBackground: '#0F172A',
  cameraOverlay: 'rgba(15, 23, 42, 0.46)',
  cameraPanel: 'rgba(15, 23, 42, 0.62)',
  cameraPanelStrong: 'rgba(15, 23, 42, 0.78)',
  cameraCaptureRing: 'rgba(255, 255, 255, 0.24)',
  roadSky: '#A8B0BA',
  roadSurface: '#626971',
  roadLane: '#D8DDE6',
  roadDark: '#23272F',
  roadDarkBorder: '#454B55',
  roadCrack: '#2D333A',
};

export function getRoadDamageType(type) {
  return ROAD_DAMAGE_TYPES[type] ?? ROAD_DAMAGE_TYPES.D40;
}
