import {
  ROAD_DAMAGE_STATUS,
  ROAD_DAMAGE_TYPES,
  ROAD_DAMAGE_UI_COLORS,
} from '../../shared-constants/src/roadDamage';

export const colors = {
  primary: ROAD_DAMAGE_UI_COLORS.primary,
  primaryDark: ROAD_DAMAGE_UI_COLORS.primaryDark,
  background: ROAD_DAMAGE_UI_COLORS.background,
  surface: ROAD_DAMAGE_UI_COLORS.surface,
  surfaceMuted: ROAD_DAMAGE_UI_COLORS.mobileSurfaceMuted,
  inputBackground: ROAD_DAMAGE_UI_COLORS.inputBackground,
  text: ROAD_DAMAGE_UI_COLORS.mobileText,
  textMuted: ROAD_DAMAGE_UI_COLORS.mobileTextMuted,
  textOnDark: ROAD_DAMAGE_UI_COLORS.textOnDark,
  textOnDarkMuted: ROAD_DAMAGE_UI_COLORS.textOnDarkMuted,
  border: ROAD_DAMAGE_UI_COLORS.mobileBorder,
  borderSoft: ROAD_DAMAGE_UI_COLORS.borderSoft,
  cameraBackground: ROAD_DAMAGE_UI_COLORS.cameraBackground,
  cameraOverlay: ROAD_DAMAGE_UI_COLORS.cameraOverlay,
  cameraPanel: ROAD_DAMAGE_UI_COLORS.cameraPanel,
  cameraPanelStrong: ROAD_DAMAGE_UI_COLORS.cameraPanelStrong,
  cameraCaptureRing: ROAD_DAMAGE_UI_COLORS.cameraCaptureRing,
  danger: ROAD_DAMAGE_UI_COLORS.danger,
  dangerSoft: ROAD_DAMAGE_UI_COLORS.dangerSoft,
  dangerBorder: ROAD_DAMAGE_UI_COLORS.dangerBorder,
  success: ROAD_DAMAGE_STATUS.repaired.color,
  warning: ROAD_DAMAGE_STATUS.pending.color,
  statusPurple: ROAD_DAMAGE_STATUS.processing.color,
  roadSky: ROAD_DAMAGE_UI_COLORS.roadSky,
  roadSurface: ROAD_DAMAGE_UI_COLORS.roadSurface,
  roadLane: ROAD_DAMAGE_UI_COLORS.roadLane,
  roadDark: ROAD_DAMAGE_UI_COLORS.roadDark,
  roadDarkBorder: ROAD_DAMAGE_UI_COLORS.roadDarkBorder,
  roadCrack: ROAD_DAMAGE_UI_COLORS.roadCrack,
};

export const reportStatusTheme = Object.fromEntries(
  Object.entries(ROAD_DAMAGE_STATUS).map(([key, value]) => [
    key,
    {
      label: value.shortLabel,
      icon: value.mobileIcon,
      color: value.color,
      backgroundColor: value.backgroundColor,
      borderColor: value.borderColor,
    },
  ]),
) as {
  [K in keyof typeof ROAD_DAMAGE_STATUS]: {
    label: string;
    icon: string;
    color: string;
    backgroundColor: string;
    borderColor: string;
  };
};

export const damageTypeTheme = Object.fromEntries(
  Object.entries(ROAD_DAMAGE_TYPES).map(([key, value]) => [
    key,
    {
      label: value.label,
      color: value.color,
      backgroundColor: value.backgroundColor,
    },
  ]),
) as {
  [K in keyof typeof ROAD_DAMAGE_TYPES]: {
    label: string;
    color: string;
    backgroundColor: string;
  };
};

export type ReportStatus = keyof typeof reportStatusTheme;
export type DamageTypeCode = keyof typeof damageTypeTheme;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  full: 999,
};

export const touchTarget = {
  min: 44,
  cameraButton: 88,
};

export const iconSize = {
  xs: 14,
  sm: 16,
  inline: 18,
  md: 20,
  tab: 24,
  nav: 24,
  lg: 24,
  xl: 32,
  action: 56,
};
