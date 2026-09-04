import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import {
  colors,
  damageTypeTheme,
  type DamageTypeCode,
  reportStatusTheme,
  type ReportStatus,
} from '../theme';
import type { Report } from '../roadDamageTypes';
import type {
  MapRegion,
  RoadDamageMapHandle,
  RoadDamageMapViewProps,
} from './RoadDamageMapView.types';

type ReportMapMarkerProps = {
  report: Report;
  isSelected: boolean;
  onSelectReport: (report: Report) => void;
  getMarkerTone?: RoadDamageMapViewProps['getMarkerTone'];
};

type MarkerPresentation = {
  damageCode: DamageTypeCode;
  damageColor: string;
  status: ReportStatus;
  statusColor: string;
  markerBorderColor: string;
  markerAccentColor: string;
  selectedBorderColor: string;
  selectedAccentColor: string;
};

function ReportMarker({
  damageColor,
  borderColor,
  accentColor,
  selectedBorderColor,
  selectedAccentColor,
  isSelected,
}: {
  damageColor: string;
  borderColor: string;
  accentColor: string;
  selectedBorderColor: string;
  selectedAccentColor: string;
  isSelected: boolean;
}) {
  return (
    <View style={styles.markerWrap}>
      <View
        style={[
          styles.markerOuter,
          isSelected
            ? [styles.markerOuterSelected, { borderColor: selectedBorderColor, backgroundColor: selectedBorderColor }]
            : { borderColor },
        ]}
      >
        <View
          style={[
            styles.markerInner,
            { backgroundColor: isSelected ? colors.surface : damageColor },
            isSelected && styles.markerInnerSelected,
          ]}
        />
        <View
          style={[
            styles.markerAccent,
            { backgroundColor: isSelected ? selectedAccentColor : accentColor },
            isSelected && styles.markerAccentSelected,
          ]}
        />
      </View>
      <View
        style={[
          styles.markerPointer,
          { borderTopColor: isSelected ? selectedBorderColor : borderColor },
        ]}
      />
    </View>
  );
}

const getMarkerPresentation = (
  report: Report,
  getMarkerTone?: RoadDamageMapViewProps['getMarkerTone'],
): MarkerPresentation => {
  const damageCode = report.type in damageTypeTheme ? report.type : 'D40';
  const status = report.status in reportStatusTheme ? report.status : 'new';
  const damageTheme = damageTypeTheme[damageCode];
  const statusTheme = reportStatusTheme[status];
  const customTone = getMarkerTone?.(report) ?? null;

  return {
    damageCode,
    damageColor: damageTheme.color,
    status,
    statusColor: statusTheme.color,
    markerBorderColor: customTone?.borderColor ?? statusTheme.color,
    markerAccentColor: customTone?.accentColor ?? statusTheme.color,
    selectedBorderColor: customTone?.selectedBorderColor ?? colors.primaryDark,
    selectedAccentColor: customTone?.selectedAccentColor ?? colors.warning,
  };
};

function ReportMapMarker({
  report,
  isSelected,
  onSelectReport,
  getMarkerTone,
}: ReportMapMarkerProps) {
  const presentation = getMarkerPresentation(report, getMarkerTone);

  return (
    <Marker
      key={report.id}
      identifier={report.id}
      coordinate={{
        latitude: report.gps.latitude,
        longitude: report.gps.longitude,
      }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges
      onPress={() => onSelectReport(report)}
      zIndex={isSelected ? 10 : 1}
    >
      <ReportMarker
        damageColor={presentation.damageColor}
        borderColor={presentation.markerBorderColor}
        accentColor={presentation.markerAccentColor}
        selectedBorderColor={presentation.selectedBorderColor}
        selectedAccentColor={presentation.selectedAccentColor}
        isSelected={isSelected}
      />
    </Marker>
  );
}

const RoadDamageMapView = forwardRef<RoadDamageMapHandle, RoadDamageMapViewProps>(
  (
    {
      reports,
      region,
      selectedReportId,
      showsUserLocation,
      onRegionChangeComplete,
      onSelectReport,
      onMapPanDrag,
      getMarkerTone,
    },
    ref,
  ) => {
    const mapRef = useRef<MapView | null>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (nextRegion: MapRegion, duration = 650) => {
        mapRef.current?.animateToRegion(nextRegion, duration);
      },
    }));

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={false}
        onPanDrag={onMapPanDrag}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {reports.map((report) => (
          <ReportMapMarker
            key={report.id}
            report={report}
            isSelected={selectedReportId === report.id}
            onSelectReport={onSelectReport}
            getMarkerTone={getMarkerTone}
          />
        ))}
      </MapView>
    );
  },
);

export default RoadDamageMapView;

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerWrap: {
    alignItems: 'center',
  },
  markerOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },
  markerOuterSelected: {
    borderWidth: 4,
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 7,
  },
  markerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  markerInnerSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  markerAccent: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  markerAccentSelected: {
    borderColor: colors.surface,
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  markerPointer: {
    marginTop: -1,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
