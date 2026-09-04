import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ReportAiResult } from './roadDamage';

export type GpsLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
  source?: 'camera_gps' | 'map_selected';
};

export type BottomTabParamList = {
  Home: undefined;
  Map: undefined;
  History: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList> | undefined;
  CameraScreen: undefined;
  ConfirmReportScreen: {
    photoUri: string;
    gps: GpsLocation;
    initialPreviewResult?: ReportAiResult | null;
    initialPreviewError?: string | null;
    initialPreviewPhotoUri?: string | null;
  };
  ReportDetailScreen: {
    reportId: string;
  };
  NearbyReportsScreen: undefined;
  ManualReviewReportsScreen: undefined;
  ProcessingUpdatesScreen: undefined;
};
