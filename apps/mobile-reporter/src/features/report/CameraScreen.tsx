import { CameraView, useCameraPermissions } from 'expo-camera';
import { File as ExpoFile } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppIcon from '../../components/AppIcon';
import BlockingOverlay from '../../components/BlockingOverlay';
import { colors, iconSize, radius, spacing } from '../../constants/theme';
import {
  getSubmitReportErrorMessage,
  MAX_GPS_ACCURACY_METERS,
  MAX_REPORT_IMAGE_DIMENSION,
  previewRoadDamageDetection,
} from '../../services/reportService';
import { ensureLocationReady } from '../../services/locationService';
import type { GpsLocation, RootStackParamList } from '../../types/navigation';
import FocusFrame from './components/FocusFrame';

type CameraScreenProps = NativeStackScreenProps<RootStackParamList, 'CameraScreen'>;

export default function CameraScreen({ navigation }: CameraScreenProps) {
  const cameraRef = useRef<CameraView | null>(null);
  const isMountedRef = useRef(true);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [gps, setGps] = useState<GpsLocation | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [isGettingGps, setIsGettingGps] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isCheckingPhoto, setIsCheckingPhoto] = useState(false);

  useEffect(() => {
    requestGpsLocation();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function requestGpsLocation() {
    setIsGettingGps(true);
    setGpsError('');

    try {
      const readiness = await ensureLocationReady({
        requestPermission: true,
        promptAlert: true,
      });

      if (!readiness.permissionGranted) {
        if (!isMountedRef.current) {
          return;
        }
        setGps(null);
        setGpsError('Ứng dụng cần quyền vị trí để ghi nhận nơi xảy ra hư hỏng.');
        return;
      }

      if (!readiness.servicesEnabled) {
        if (!isMountedRef.current) {
          return;
        }
        setGps(null);
        setGpsError('Vui lòng bật định vị GPS trên thiết bị để chụp ảnh hiện trường.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!isMountedRef.current) {
        return;
      }

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;
      const accuracy = Math.round(location.coords.accuracy ?? 0);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setGps(null);
        setGpsError('Không đọc được vị trí hợp lệ. Vui lòng thử lại.');
        return;
      }

      if (latitude === 0 && longitude === 0) {
        setGps(null);
        setGpsError('Thiết bị đang trả về vị trí 0,0. Vui lòng di chuyển đến vị trí thực tế và thử lại.');
        return;
      }

      if (!Number.isFinite(accuracy) || accuracy <= 0) {
        setGps(null);
        setGpsError('Không đọc được độ chính xác vị trí. Vui lòng thử lại.');
        return;
      }

      if (accuracy > MAX_GPS_ACCURACY_METERS) {
        setGps(null);
        setGpsError(`Độ chính xác vị trí hiện tại là ±${accuracy}m, vượt mức cho phép ±${MAX_GPS_ACCURACY_METERS}m.`);
        return;
      }

      setGps({
        latitude,
        longitude,
        accuracy,
        capturedAt: new Date().toISOString(),
        source: 'camera_gps',
      });
    } catch {
      if (!isMountedRef.current) {
        return;
      }
      setGps(null);
      setGpsError('Không lấy được vị trí hiện tại. Vui lòng bật định vị và thử lại.');
    } finally {
      if (isMountedRef.current) {
        setIsGettingGps(false);
      }
    }
  }

  async function handleCapture() {
    if (isCapturing) {
      return;
    }

    setCameraError('');

    if (!gps) {
      setGpsError('Vui lòng đợi lấy vị trí trước khi chụp ảnh.');
      return;
    }

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Không chụp được ảnh.');
      }

      const photoWidth = Number.isFinite(photo.width) ? photo.width : undefined;
      const photoHeight = Number.isFinite(photo.height) ? photo.height : undefined;
      const longestEdge = Math.max(photoWidth ?? 0, photoHeight ?? 0);
      const shouldResize = longestEdge > MAX_REPORT_IMAGE_DIMENSION;
      const optimizedPhoto = await manipulateAsync(
        photo.uri,
        shouldResize
          ? [
              photoWidth && photoHeight
                ? photoWidth >= photoHeight
                  ? { resize: { width: MAX_REPORT_IMAGE_DIMENSION } }
                  : { resize: { height: MAX_REPORT_IMAGE_DIMENSION } }
                : { resize: { width: MAX_REPORT_IMAGE_DIMENSION } },
            ]
          : [],
        {
          compress: 0.78,
          format: SaveFormat.JPEG,
        },
      );

      if (!optimizedPhoto?.uri) {
        throw new Error('Không tối ưu được ảnh.');
      }

      if (photo.uri !== optimizedPhoto.uri) {
        try {
          const rawPhoto = new ExpoFile(photo.uri) as unknown as {
            exists: boolean;
            delete: () => void;
          };
          if (rawPhoto.exists) {
            rawPhoto.delete();
          }
        } catch {
          // Ignore temp cleanup errors
        }
      }

      if (!isMountedRef.current) {
        return;
      }

      setIsCheckingPhoto(true);

      try {
        const initialPreviewResult = await previewRoadDamageDetection(optimizedPhoto.uri);

        if (!isMountedRef.current) {
          return;
        }

        navigation.navigate('ConfirmReportScreen', {
          photoUri: optimizedPhoto.uri,
          gps: {
            ...gps,
            capturedAt: new Date().toISOString(),
            source: 'camera_gps',
          },
          initialPreviewResult,
          initialPreviewError: null,
          initialPreviewPhotoUri: optimizedPhoto.uri,
        });
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }

        const previewErrorMessage = getSubmitReportErrorMessage(error);
        navigation.navigate('ConfirmReportScreen', {
          photoUri: optimizedPhoto.uri,
          gps: {
            ...gps,
            capturedAt: new Date().toISOString(),
            source: 'camera_gps',
          },
          initialPreviewResult: null,
          initialPreviewError: previewErrorMessage,
          initialPreviewPhotoUri: optimizedPhoto.uri,
        });
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      if (error instanceof Error && error.message) {
        setCameraError(getSubmitReportErrorMessage(error.message));
        return;
      }
      setCameraError('Không xử lý được ảnh chụp. Vui lòng thử lại.');
    } finally {
      if (isMountedRef.current) {
        setIsCapturing(false);
        setIsCheckingPhoto(false);
      }
    }
  }

  if (!cameraPermission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <AppIcon name="camera-outline" size={56} color={colors.primaryDark} containerSize={56} />
        <Text selectable style={styles.permissionTitle}>
          Cần quyền truy cập camera
        </Text>
        <Text selectable style={styles.permissionDescription}>
          Bạn cần chụp ảnh trực tiếp tại hiện trường, không chọn ảnh từ thư viện.
        </Text>
        <AppButton label="Cấp quyền camera" onPress={requestCameraPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {isCheckingPhoto ? (
        <View style={styles.cameraPausedBackdrop} />
      ) : (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          animateShutter={false}
        />
      )}
      <View pointerEvents="none" style={styles.overlay} />

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.topSection}>
          <View style={styles.headerBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              hitSlop={12}
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            >
              <AppIcon name="arrow-back" size={20} color={colors.textOnDark} containerSize={22} />
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Text selectable numberOfLines={1} style={styles.headerTitle}>
                Chụp ảnh hiện trường
              </Text>
              <View style={styles.headerBadge}>
                <View style={[styles.headerStatusDot, gps ? styles.dotReady : styles.dotPending]} />
                <Text numberOfLines={1} style={styles.headerBadgeText}>
                  {gps
                    ? `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)} (±${gps.accuracy}m)`
                    : isGettingGps
                    ? 'Đang lấy vị trí GPS...'
                    : 'Chưa xác định vị trí'}
                </Text>
              </View>
            </View>
          </View>

          {gpsError ? (
            <View style={styles.gpsErrorCard}>
              <Text selectable style={styles.gpsErrorText}>
                {gpsError}
              </Text>
              <AppButton label="Lấy lại vị trí" variant="outline" onPress={requestGpsLocation} />
            </View>
          ) : null}

          {cameraError ? (
            <View style={styles.cameraErrorCard}>
              <Text selectable style={styles.gpsErrorText}>
                {cameraError}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.viewfinder}>
          <FocusFrame />
        </View>

        <View style={styles.bottomPanel}>
          <View style={styles.shutterRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chụp ảnh mặt đường"
              disabled={isCapturing || !gps}
              hitSlop={16}
              onPress={handleCapture}
              style={({ pressed }) => [
                styles.shutterOuterRing,
                pressed && styles.shutterPressed,
                (isCapturing || !gps) && styles.shutterDisabled,
              ]}
            >
              <View style={styles.shutterInnerCircle}>
                {isCapturing ? (
                  <ActivityIndicator color="#0F172A" size="small" />
                ) : (
                  <View style={[styles.shutterCore, !gps && styles.shutterCoreWaiting]} />
                )}
              </View>
            </Pressable>
          </View>

          <Text selectable numberOfLines={1} style={styles.captureMeta}>
            {gps ? 'Chạm để chụp ảnh' : 'Đang chờ tín hiệu GPS...'}
          </Text>
        </View>
      </SafeAreaView>
      <BlockingOverlay
        visible={isCheckingPhoto}
        variant="toast"
        message="Đang kiểm tra ảnh, vui lòng chờ hệ thống trả kết quả..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cameraBackground,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  permissionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraPausedBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cameraBackground,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  topSection: {
    gap: spacing.xs,
    paddingTop: 4,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: colors.textOnDark,
    fontSize: 16,
    fontWeight: '800',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotReady: {
    backgroundColor: '#22C55E',
  },
  dotPending: {
    backgroundColor: '#F59E0B',
  },
  headerBadgeText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '600',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  gpsErrorCard: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  gpsErrorText: {
    color: colors.textOnDark,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraErrorCard: {
    alignSelf: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    marginTop: 4,
  },
  viewfinder: {
    flex: 1,
    marginVertical: spacing.md,
  },
  bottomPanel: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: spacing.lg,
  },
  shutterRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuterRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterInnerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  shutterCoreWaiting: {
    backgroundColor: '#94A3B8',
  },
  captureMeta: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
