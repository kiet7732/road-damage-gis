import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getZoomFromRegion = (region: MapRegion): number => {
  const normalizedDelta = Math.max(region.longitudeDelta, region.latitudeDelta, 0.0001);
  const zoom = Math.round(Math.log2(360 / normalizedDelta));
  return clamp(zoom, 4, 19);
};

const getMarkerPresentation = (
  report: Report,
  getMarkerTone?: RoadDamageMapViewProps['getMarkerTone'],
) => {
  const damageCode = report.type in damageTypeTheme ? report.type : 'D40';
  const status = report.status in reportStatusTheme ? report.status : 'new';
  const damageTheme = damageTypeTheme[damageCode];
  const statusTheme = reportStatusTheme[status];
  const customTone = getMarkerTone?.(report) ?? null;

  return {
    damageColor: damageTheme.color,
    markerBorderColor: customTone?.borderColor ?? statusTheme.color,
    selectedBorderColor: customTone?.selectedBorderColor ?? colors.primaryDark,
  };
};

function generateMapHtml(initialRegion: MapRegion, initialZoom: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
  <link rel="dns-prefetch" href="https://a.basemaps.cartocdn.com" />
  <link rel="dns-prefetch" href="https://b.basemaps.cartocdn.com" />
  <link rel="dns-prefetch" href="https://c.basemaps.cartocdn.com" />
  <link rel="dns-prefetch" href="https://tile.openstreetmap.org" />
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin />
  <link rel="preconnect" href="https://a.basemaps.cartocdn.com" crossorigin />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: #eef2f5;
      overflow: hidden;
      touch-action: none;
    }
    /* Anti-blur & hardware acceleration for map tiles */
    .leaflet-tile-container {
      will-change: transform;
    }
    .leaflet-tile {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      transform: translate3d(0, 0, 0);
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
    }
    .leaflet-tile-loaded {
      opacity: 1 !important;
      transition: opacity 0.12s ease-in !important;
    }
    .leaflet-zoom-animated {
      will-change: transform;
    }
    .leaflet-control-attribution {
      font-size: 8px !important;
      background: rgba(255, 255, 255, 0.8) !important;
      padding: 0 4px !important;
      border-top-left-radius: 4px;
    }
    .custom-marker {
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      will-change: transform;
    }
    .pulse-ring {
      position: absolute;
      top: -7px;
      left: -7px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.35);
      animation: pulse 1.6s infinite ease-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map;
    var markersMap = {};
    var userLocationMarker = null;
    var isUserInteracting = false;
    var isMapReady = false;

    map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      fadeAnimation: true,
      zoomAnimation: true,
      preferCanvas: true,
      inertia: true,
      inertiaDeceleration: 3000,
      wheelDebounceTime: 40
    }).setView([${initialRegion.latitude}, ${initialRegion.longitude}], ${initialZoom});

    // High-performance OpenStreetMap standard tiles (No API key required)
    var tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
      maxNativeZoom: 19,
      detectRetina: false,
      updateWhenIdle: false,
      updateInterval: 80,
      keepBuffer: 12,
      attribution: '&copy; OpenStreetMap contributors'
    });

    tileLayer.addTo(map);

    map.on('movestart', function() {
      isUserInteracting = true;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAN_DRAG' }));
      }
    });

    map.on('moveend', function() {
      if (!isUserInteracting) return;
      isUserInteracting = false;
      var center = map.getCenter();
      var bounds = map.getBounds();
      var region = {
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: Math.abs(bounds.getNorth() - bounds.getSouth()) || 0.01,
        longitudeDelta: Math.abs(bounds.getEast() - bounds.getWest()) || 0.01
      };
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REGION_CHANGE', region: region }));
      }
    });

    function createMarkerIcon(damageColor, borderColor, isSelected) {
      var size = isSelected ? 26 : 18;
      var innerSize = isSelected ? 12 : 8;
      var borderWidth = isSelected ? 3 : 2.5;
      var html = '<div class="custom-marker" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:#ffffff;border:' + borderWidth + 'px solid ' + borderColor + ';box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">' +
        '<div style="width:' + innerSize + 'px;height:' + innerSize + 'px;border-radius:50%;background:' + damageColor + ';"></div>' +
        '</div>';
      return L.divIcon({
        className: 'report-div-icon',
        html: html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
    }

    window.renderReports = function(reportsData, selectedId) {
      var currentIds = {};
      for (var i = 0; i < reportsData.length; i++) {
        var r = reportsData[i];
        currentIds[r.id] = true;
        var isSelected = (r.id === selectedId);
        var icon = createMarkerIcon(r.damageColor, isSelected ? r.selectedBorderColor : r.markerBorderColor, isSelected);

        if (markersMap[r.id]) {
          markersMap[r.id].setIcon(icon);
          markersMap[r.id].setZIndexOffset(isSelected ? 1000 : 1);
        } else {
          var marker = L.marker([r.lat, r.lng], { icon: icon, zIndexOffset: isSelected ? 1000 : 1 });
          (function(reportId) {
            marker.on('click', function() {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_REPORT', id: reportId }));
              }
            });
          })(r.id);
          marker.addTo(map);
          markersMap[r.id] = marker;
        }
      }

      for (var id in markersMap) {
        if (!currentIds[id]) {
          map.removeLayer(markersMap[id]);
          delete markersMap[id];
        }
      }
    };

    window.updateUserLocation = function(userLoc) {
      if (!userLoc) {
        if (userLocationMarker) {
          map.removeLayer(userLocationMarker);
          userLocationMarker = null;
        }
        return;
      }
      var icon = L.divIcon({
        className: 'user-loc-icon',
        html: '<div style="position:relative;width:18px;height:18px;"><div class="pulse-ring"></div><div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #FFFFFF;box-shadow:0 0 4px rgba(0,0,0,0.4);"></div></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      if (userLocationMarker) {
        userLocationMarker.setLatLng([userLoc.latitude, userLoc.longitude]);
      } else {
        userLocationMarker = L.marker([userLoc.latitude, userLoc.longitude], { icon: icon, zIndexOffset: 500 }).addTo(map);
      }
    };

    window.flyToRegion = function(lat, lng, zoom, duration) {
      isUserInteracting = false;
      map.flyTo([lat, lng], zoom, { duration: (duration || 650) / 1000 });
    };

    setTimeout(function() {
      isMapReady = true;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    }, 100);
  </script>
</body>
</html>`;
}

const RoadDamageMapView = forwardRef<RoadDamageMapHandle, RoadDamageMapViewProps>(
  (
    {
      reports,
      region,
      selectedReportId,
      showsUserLocation,
      userLocation,
      onRegionChangeComplete,
      onSelectReport,
      onMapPanDrag,
      getMarkerTone,
    },
    ref,
  ) => {
    const webViewRef = useRef<WebView | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    const initialZoom = useMemo(() => getZoomFromRegion(region), []);
    const htmlSource = useMemo(
      () => ({ html: generateMapHtml(region, initialZoom) }),
      [], // only compute once so WebView does not reload on region changes
    );

    const serializedReports = useMemo(() => {
      return reports.map((r) => {
        const presentation = getMarkerPresentation(r, getMarkerTone);
        return {
          id: r.id,
          lat: r.gps.latitude,
          lng: r.gps.longitude,
          damageColor: presentation.damageColor,
          markerBorderColor: presentation.markerBorderColor,
          selectedBorderColor: presentation.selectedBorderColor,
        };
      });
    }, [reports, getMarkerTone]);

    useImperativeHandle(ref, () => ({
      animateToRegion: (nextRegion: MapRegion, duration = 650) => {
        const zoom = getZoomFromRegion(nextRegion);
        webViewRef.current?.injectJavaScript(
          `if (window.flyToRegion) { window.flyToRegion(${nextRegion.latitude}, ${nextRegion.longitude}, ${zoom}, ${duration}); } true;`,
        );
      },
    }));

    // Synchronize reports and selectedReportId to the Leaflet map
    useEffect(() => {
      if (!isMapReady) return;
      const payload = JSON.stringify(serializedReports);
      const selId = JSON.stringify(selectedReportId ?? null);
      webViewRef.current?.injectJavaScript(
        `if (window.renderReports) { window.renderReports(${payload}, ${selId}); } true;`,
      );
    }, [isMapReady, serializedReports, selectedReportId]);

    // Synchronize user location marker to the Leaflet map
    useEffect(() => {
      if (!isMapReady) return;
      const userLoc = showsUserLocation && userLocation ? userLocation : null;
      const payload = JSON.stringify(userLoc);
      webViewRef.current?.injectJavaScript(
        `if (window.updateUserLocation) { window.updateUserLocation(${payload}); } true;`,
      );
    }, [isMapReady, showsUserLocation, userLocation]);

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'MAP_READY') {
          setIsMapReady(true);
        } else if (data.type === 'SELECT_REPORT') {
          const found = reports.find((item) => item.id === data.id);
          if (found) {
            onSelectReport(found);
          }
        } else if (data.type === 'REGION_CHANGE') {
          onRegionChangeComplete(data.region);
        } else if (data.type === 'PAN_DRAG') {
          onMapPanDrag?.();
        }
      } catch {
        // ignore parse error
      }
    };

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={htmlSource}
          style={styles.webView}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          androidLayerType="hardware"
          renderToHardwareTextureAndroid={true}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          onMessage={handleMessage}
        />
      </View>
    );
  },
);

export default RoadDamageMapView;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
  },
  webView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
  },
});
