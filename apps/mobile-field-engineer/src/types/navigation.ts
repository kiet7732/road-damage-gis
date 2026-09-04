import type { NavigatorScreenParams } from '@react-navigation/native';

export type EngineerBottomTabParamList = {
  Home: undefined;
  Map: undefined;
  Tasks: undefined;
  Profile: undefined;
};

export type EngineerAuthStackParamList = {
  Login: undefined;
};

export type EngineerRootStackParamList = {
  MainTabs: NavigatorScreenParams<EngineerBottomTabParamList> | undefined;
  EngineerTaskDetail: {
    reportId: string;
  };
  EngineerCheckIn: {
    reportId: string;
  };
  EngineerSurvey: {
    reportId: string;
  };
  EngineerAttachments: {
    reportId: string;
  };
  EngineerHistory: undefined;
};
