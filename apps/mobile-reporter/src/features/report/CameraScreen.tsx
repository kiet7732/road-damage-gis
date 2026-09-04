import { CameraView, useCameraPermissions } from 'expo-camera';
import { File as ExpoFile } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppIcon from '../../components/AppIcon';
import BlockingOverlay from '../../components/BlockingOverlay';
import { colors, iconSize, radius, spacing, touchTarget } from '../../constants/theme';
import {
  getSubmitReportErrorMessage,
  MAX_GPS_ACCURACY_METERS,
  MAX_REPORT_IMAGE_DIMENSION,
  previewRoadDamageDetection,
} from '../../services/reportService';
import type { GpsLocation, RootStackParamList } from '../../types/navigation';
import FocusFrame from './components/FocusFrame';
import GpsStatusCard from './components/GpsStatusCard';
import NoGalleryNotice from './components/NoGalleryNotice';

type CameraScreenProps = NativeStackScreenProps<RootStackParamList, 'CameraScreen'>;

export default function CameraScreen({ navigation }: CameraScreenProps) {
  const insets = useSafeAreaInsets();
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
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        if (!isMountedRef.current) {
          return;
        }
        setGps(null);
        setGpsError('Ứng dụng cần quyền vị trí để ghi nhận nơi xảy ra hư hỏng.');
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
        quality: 0.82,
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
          // Bỏ qua lỗi dọn file ảnh gốc tạm thời.
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
    } catch {
      if (!isMountedRef.current) {
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
        <AppIcon name="camera-outline" size={iconSize.xl} color={colors.primaryDark} containerSize={56} />
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
      {isCheckingPhoto ? <View style={styles.cameraPausedBackdrop} /> : <CameraView ref={cameraRef} style={styles.camera} facing="back" />}
      <View pointerEvents="none" style={styles.overlay} />

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.topSection}>
          <View style={styles.headerWrap}>
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                hitSlop={10}
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              >
                <AppIcon name="arrow-back" size={18} color={colors.textOnDark} containerSize={18} />
              </Pressable>
              <Text selectable numberOfLines={1} adjustsFontSizeToFit style={styles.headerTitle}>
                Chụp ảnh hiện trường
              </Text>
            </View>
          </View>

          {gps ? (
            <GpsStatusCard gps={gps} isRefreshing={isGettingGps} />
          ) : (
            <View style={styles.gpsErrorCard}>
              {isGettingGps ? <ActivityIndicator color={colors.primary} /> : null}
              <Text selectable style={styles.gpsErrorText}>
              {isGettingGps ? 'Đang lấy vị trí hiện tại...' : gpsError}
              </Text>
              {!isGettingGps ? (
                <AppButton label="Lấy lại vị trí" variant="outline" onPress={requestGpsLocation} />
              ) : null}
            </View>
          )}
        </View>

        {cameraError ? (
          <View style={styles.cameraErrorCard}>
            <Text selectable style={styles.gpsErrorText}>
              {cameraError}
            </Text>
          </View>
        ) : null}

        <View style={styles.viewfinder}>
          <FocusFrame />
        </View>

        <View
          style={[
            styles.bottomPanel,
            { paddingBottom: Math.max(spacing.md, insets.bottom + spacing.xs) },
          ]}
        >
          <NoGalleryNotice />
          <Text selectable style={styles.captureHint}>
            Căn vùng hư hỏng vào khung rồi chụp
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chụp ảnh mặt đường hư hỏng"
            disabled={isCapturing || !gps}
            hitSlop={12}
            onPress={handleCapture}
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.captureButtonPressed,
              (isCapturing || !gps) && styles.captureButtonDisabled,
            ]}
          >
            <View style={styles.captureButtonInner}>
              {isCapturing ? (
                <ActivityIndicator color={colors.cameraBackground} />
              ) : (
                <View style={styles.captureButtonCore} />
              )}
            </View>
          </Pressable>
          <Text selectable style={styles.captureMeta}>
            Chụp trực tiếp để hệ thống ghi nhận đúng vị trí
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
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  permissionDescription: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraPausedBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cameraOverlay,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  topSection: {
    gap: spacing.sm,
    paddingTop: 2,
  },
  headerWrap: {
    paddingHorizontal: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.8,
  },
  headerTitle: {
    color: colors.textOnDark,
    fontSize: 16,
    fontWeight: '900',
  },
  gpsErrorCard: {
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(11, 20, 46, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  gpsErrorText: {
    color: colors.textOnDark,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  cameraErrorCard: {
    alignSelf: 'center',
    maxWidth: '92%',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,92,119,0.12)',
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  viewfinder: {
    flex: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  bottomPanel: {
    alignItems: 'center',
    gap: 4,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    backgroundColor: 'rgba(11, 20, 46, 0.88)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  captureHint: {
    color: colors.textOnDark,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  captureButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: '#FF8A3D',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.94 }],
  },
  captureButtonDisabled: {
    opacity: 0.55,
  },
  captureButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonCore: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  captureMeta: {
    color: colors.textOnDarkMuted,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 0,
  },
});
