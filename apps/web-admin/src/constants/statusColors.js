import {
  getRoadDamageStatus,
  ROAD_DAMAGE_STATUS,
  ROAD_DAMAGE_TYPES,
  ROAD_DAMAGE_UI_COLORS,
} from '../../../../packages/shared-constants/src/roadDamage';

export const STATUS_COLORS = Object.fromEntries(
  Object.entries(ROAD_DAMAGE_STATUS).map(([key, value]) => [
    key,
    {
      label: value.label,
      text: value.color,
      background: value.backgroundColor,
      border: value.borderColor,
      icon: value.webIcon,
    },
  ]),
);

export const DAMAGE_TYPE_COLORS = Object.fromEntries(
  Object.entries(ROAD_DAMAGE_TYPES).map(([key, value]) => [key, value.color]),
);

export const DAMAGE_TYPES = ROAD_DAMAGE_TYPES;

export const UI_COLORS = {
  primary: ROAD_DAMAGE_UI_COLORS.primary,
  primaryDark: ROAD_DAMAGE_UI_COLORS.primaryDark,
  background: ROAD_DAMAGE_UI_COLORS.background,
  surface: ROAD_DAMAGE_UI_COLORS.surface,
  surfaceMuted: ROAD_DAMAGE_UI_COLORS.surfaceMuted,
  text: ROAD_DAMAGE_UI_COLORS.text,
  textMuted: ROAD_DAMAGE_UI_COLORS.textMuted,
  border: ROAD_DAMAGE_UI_COLORS.border,
  sidebar: ROAD_DAMAGE_UI_COLORS.sidebar,
  sidebarText: ROAD_DAMAGE_UI_COLORS.sidebarText,
  danger: ROAD_DAMAGE_UI_COLORS.danger,
};

export function getStatusColor(status) {
  const value = getRoadDamageStatus(status);

  return {
    label: value.label,
    text: value.color,
    background: value.backgroundColor,
    border: value.borderColor,
    icon: value.webIcon,
  };
}
