import type { DimensionValue } from 'react-native';
import type { DamageTypeCode, ReportStatus } from './theme';

export type GpsLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
  source?: 'camera_gps' | 'map_selected';
};

export type DamageSummary = {
  code: DamageTypeCode;
  count: number;
};

export type MapPoint = {
  id: string;
  top: DimensionValue;
  left: DimensionValue;
  status: ReportStatus;
  type: DamageTypeCode;
};

export type ReporterUser = {
  id: string;
  name: string;
  role: string;
  reportCount: number;
  phone: string;
  defaultArea: string;
};

export type Report = {
  id: string;
  title: string;
  address: string;
  status: ReportStatus;
  type: DamageTypeCode;
  createdAt: string;
  createdAtRaw?: string;
  updatedAt?: string;
  updatedAtRaw?: string;
  photoUri?: string;
  gps: GpsLocation;
  note?: string | null;
  aiStatus?: string;
  confidence?: number | null;
};

export type DamageDetection = {
  damageType: string;
  className?: string | null;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
};

export type ReportAiResult = {
  success: boolean;
  detectionsCount: number;
  detections: DamageDetection[];
  processingTimeMs?: number | null;
  message: string;
  previewToken?: string | null;
};

export type ReportDetail = Report & {
  photoUri?: string;
  note?: string | null;
  aiStatus: string;
  aiResult: ReportAiResult;
  rawStatus: string;
  updatedAt: string;
};

export type HomeOverview = {
  damageSummary: DamageSummary[];
};

export type NewReportPayload = {
  photoUri: string;
  gps: GpsLocation;
  note: string;
  previewToken?: string | null;
};
