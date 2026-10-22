import { CameraView } from 'expo-camera';
import { File as ExpoFile } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, colors, radius, spacing } from '../../../shared/mobileShared';
import type { EngineerTask } from '../../../services/engineerReportService';

const MAX_IMAGE_DIMENSION = 1600;

type Props = {
  visible: boolean;
  task: EngineerTask;
  onClose: () => void;
  onCapturePhoto: (photoUri: string) => void;
};

export default function EngineerCameraView({
  visible,
  task,
  onClose,
  onCapturePhoto,
}: Props) {
  const cameraRef = useRef<CameraView | null>(null);
  const isMountedRef = useRef(true);

  const [currentGps, setCurrentGps] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    isMountedRef.current = true;

    void (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (isMountedRef.current) {
            setCurrentGps({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: Math.round(loc.coords.accuracy ?? 5),
            });
          }
        }
      } catch {
        // Fallback to task coords if needed
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleSnapPhoto() {
    if (isCapturing) return;

    try {
      setIsCapturing(true);
      setCameraError('');

      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Không thể chụp ảnh.');
      }

      const photoWidth = Number.isFinite(photo.width) ? photo.width : undefined;
      const photoHeight = Number.isFinite(photo.height) ? photo.height : undefined;
      const longestEdge = Math.max(photoWidth ?? 0, photoHeight ?? 0);
      const shouldResize = longestEdge > MAX_IMAGE_DIMENSION;

      const optimized = await manipulateAsync(
        photo.uri,
        shouldResize
          ? [
              photoWidth && photoHeight
                ? photoWidth >= photoHeight
                  ? { resize: { width: MAX_IMAGE_DIMENSION } }
                  : { resize: { height: MAX_IMAGE_DIMENSION } }
                : { resize: { width: MAX_IMAGE_DIMENSION } },
            ]
          : [],
        {
          compress: 0.8,
          format: SaveFormat.JPEG,
        },
      );

      if (photo.uri !== optimized.uri) {
        try {
          const rawPhoto = new ExpoFile(photo.uri) as unknown as {
            exists: boolean;
            delete: () => void;
          };
          if (rawPhoto.exists) {
            rawPhoto.delete();
          }
        } catch {
          // Ignore temp cleanup error
        }
      }

      if (isMountedRef.current) {
        setIsCapturing(false);
        onCapturePhoto(optimized.uri);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setIsCapturing(false);
        setCameraError(err instanceof Error ? err.message : 'Lỗi khi xử lý ảnh chụp.');
      }
    }
  }

  const lat = (currentGps?.latitude ?? task.gps?.latitude ?? 0).toFixed(6);
  const lng = (currentGps?.longitude ?? task.gps?.longitude ?? 0).toFixed(6);
  const acc = currentGps?.accuracy ?? task.gps?.accuracy ?? 5;
  const taskCode = task.id.slice(0, 8).toUpperCase();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <StatusBar style="light" />

        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          animateShutter={false}
        />

        <View pointerEvents="none" style={styles.overlay} />

        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          {/* Top Bar */}
          <View style={styles.topSection}>
            <View style={styles.headerBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng camera"
                hitSlop={12}
                onPress={onClose}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              >
                <AppIcon name="close" size={20} color="#FFFFFF" containerSize={22} />
              </Pressable>

              <View style={styles.headerTitleWrap}>
                <Text numberOfLines={1} style={styles.headerTitle}>
                  Chụp ảnh bổ sung
                </Text>
                <Text numberOfLines={1} style={styles.headerSubtitle}>
                  #{taskCode} • {lat}, {lng} (±{acc}m)
                </Text>
              </View>
            </View>

            {cameraError ? (
              <View style={styles.cameraErrorCard}>
                <Text style={styles.errorText}>{cameraError}</Text>
              </View>
            ) : null}
          </View>

          {/* Viewfinder with clean corner brackets */}
          <View style={styles.viewfinder}>
            <View pointerEvents="none" style={styles.cornerFrame}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomPanel}>
            <View style={styles.shutterRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chụp ảnh khảo sát"
                disabled={isCapturing}
                hitSlop={16}
                onPress={() => void handleSnapPhoto()}
                style={({ pressed }) => [
                  styles.shutterOuterRing,
                  pressed && styles.shutterPressed,
                  isCapturing && styles.shutterDisabled,
                ]}
              >
                <View style={styles.shutterInnerCircle}>
                  {isCapturing ? (
                    <ActivityIndicator size="small" color="#0F172A" />
                  ) : (
                    <View style={styles.shutterCore} />
                  )}
                </View>
              </Pressable>
            </View>

            <Text numberOfLines={1} style={styles.captureMeta}>
              {isCapturing ? 'Đang xử lý ảnh...' : 'Chạm nút để chụp ảnh'}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const cornerLength = 28;
const cornerThickness = 2.5;
const cornerColor = 'rgba(255, 255, 255, 0.75)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
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
  cameraErrorCard: {
    alignSelf: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    marginTop: 4,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewfinder: {
    flex: 1,
    marginVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerFrame: {
    width: '100%',
    flex: 1,
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: cornerLength,
    height: cornerLength,
    borderTopWidth: cornerThickness,
    borderLeftWidth: cornerThickness,
    borderColor: cornerColor,
    borderTopLeftRadius: 6,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: cornerLength,
    height: cornerLength,
    borderTopWidth: cornerThickness,
    borderRightWidth: cornerThickness,
    borderColor: cornerColor,
    borderTopRightRadius: 6,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: cornerLength,
    height: cornerLength,
    borderBottomWidth: cornerThickness,
    borderLeftWidth: cornerThickness,
    borderColor: cornerColor,
    borderBottomLeftRadius: 6,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: cornerLength,
    height: cornerLength,
    borderBottomWidth: cornerThickness,
    borderRightWidth: cornerThickness,
    borderColor: cornerColor,
    borderBottomRightRadius: 6,
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
  captureMeta: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
