import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export type CachedUserLocation = {
  latitude: number;
  longitude: number;
};

let cachedUserLocation: CachedUserLocation | null = null;
let preloadPromise: Promise<CachedUserLocation | null> | null = null;

const toCachedUserLocation = (
  location: Location.LocationObject | Location.LocationObjectCoords | null | undefined,
): CachedUserLocation | null => {
  if (!location) {
    return null;
  }

  const coords = 'coords' in location ? location.coords : location;

  if (
    typeof coords.latitude !== 'number' ||
    typeof coords.longitude !== 'number' ||
    !Number.isFinite(coords.latitude) ||
    !Number.isFinite(coords.longitude)
  ) {
    return null;
  }

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
};

export const getCachedUserLocation = (): CachedUserLocation | null => cachedUserLocation;

export const setCachedUserLocation = (location: CachedUserLocation | null): void => {
  cachedUserLocation = location;
};

export interface LocationReadiness {
  permissionGranted: boolean;
  servicesEnabled: boolean;
  error?: string;
}

export interface EnsureLocationOptions {
  requestPermission?: boolean;
  promptAlert?: boolean;
}

/**
 * Đảm bảo ứng dụng có đủ quyền vị trí và dịch vụ định vị (GPS) đã được bật.
 * - Tự động xin quyền (requestForegroundPermissionsAsync) nếu chưa cấp.
 * - Trên Android: Tự động kích hoạt hộp thoại hệ thống yêu cầu bật GPS (enableNetworkProviderAsync) nếu GPS đang tắt.
 * - Nhắc nhở người dùng mở Cài đặt nếu quyền bị từ chối vĩnh viễn hoặc GPS vẫn bị tắt.
 */
export const ensureLocationReady = async (
  options: EnsureLocationOptions = {},
): Promise<LocationReadiness> => {
  const { promptAlert = false, requestPermission = true } = options;

  try {
    // 1. Kiểm tra và xin quyền vị trí nếu chưa có
    let permission = await Location.getForegroundPermissionsAsync().catch(() => null);

    if (!permission?.granted && requestPermission) {
      permission = await Location.requestForegroundPermissionsAsync().catch(() => null);
    }

    if (!permission?.granted) {
      if (promptAlert && Platform.OS !== 'web') {
        Alert.alert(
          'Yêu cầu quyền vị trí',
          'Ứng dụng Road Damage GIS cần quyền vị trí để định vị hư hỏng mặt đường và hiển thị các điểm phản ánh gần bạn.',
          [
            { text: 'Để sau', style: 'cancel' },
            {
              text: 'Mở Cài đặt',
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ],
        );
      }
      return {
        permissionGranted: false,
        servicesEnabled: false,
        error: 'Chưa được cấp quyền truy cập vị trí.',
      };
    }

    // 2. Kiểm tra dịch vụ định vị GPS phần cứng của máy
    let servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);

    if (!servicesEnabled && Platform.OS === 'android') {
      try {
        await Location.enableNetworkProviderAsync();
        servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
      } catch {
        // Người dùng chọn không bật hoặc thiết bị không hỗ trợ
      }
    }

    if (!servicesEnabled) {
      if (promptAlert && Platform.OS !== 'web') {
        Alert.alert(
          'Chưa bật định vị GPS',
          'Thiết bị đang tắt vị trí (GPS). Vui lòng bật định vị để ứng dụng có thể lấy tọa độ hiện tại.',
          [
            { text: 'Để sau', style: 'cancel' },
            {
              text: 'Mở Cài đặt',
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ],
        );
      }
      return {
        permissionGranted: true,
        servicesEnabled: false,
        error: 'Dịch vụ định vị GPS trên thiết bị đang tắt.',
      };
    }

    return {
      permissionGranted: true,
      servicesEnabled: true,
    };
  } catch (err) {
    return {
      permissionGranted: false,
      servicesEnabled: false,
      error: err instanceof Error ? err.message : 'Lỗi kiểm tra vị trí',
    };
  }
};

export const preloadUserLocation = async (
  options: EnsureLocationOptions = {},
): Promise<CachedUserLocation | null> => {
  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = (async () => {
    try {
      const readiness = await ensureLocationReady({
        requestPermission: options.requestPermission ?? true,
        promptAlert: options.promptAlert ?? false,
      });

      if (!readiness.permissionGranted) {
        return cachedUserLocation;
      }

      // Lấy nhanh vị trí lưu gần nhất (nếu có)
      const lastKnownLocation = await Location.getLastKnownPositionAsync().catch(() => null);
      const mappedLastKnownLocation = toCachedUserLocation(lastKnownLocation);

      if (mappedLastKnownLocation) {
        cachedUserLocation = mappedLastKnownLocation;

        // Trả về ngay lập tức để màn hình chính tải xong tức thì, không bị khựng chờ 3 giây!
        // Vị trí GPS cập nhật sẽ chạy ngầm không gây nghẽn UI:
        if (readiness.servicesEnabled) {
          void (async () => {
            try {
              const freshPos = await Promise.race([
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
              ]);
              const mapped = toCachedUserLocation(freshPos);
              if (mapped) {
                cachedUserLocation = mapped;
              }
            } catch {}
          })();
        }

        return cachedUserLocation;
      }

      // Nếu máy chưa từng lưu vị trí trước đó: Lấy nhanh vị trí mạng/WiFi (~300ms)
      if (readiness.servicesEnabled) {
        const freshPos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]).catch(() => null);

        const mapped = toCachedUserLocation(freshPos);
        if (mapped) {
          cachedUserLocation = mapped;
        }
      }

      return cachedUserLocation;
    } catch {
      return cachedUserLocation;
    } finally {
      preloadPromise = null;
    }
  })();

  return preloadPromise;
};

export const getOrLoadUserLocation = async (
  options: EnsureLocationOptions = {},
): Promise<CachedUserLocation | null> => {
  if (cachedUserLocation) {
    return cachedUserLocation;
  }

  return preloadUserLocation(options);
};

export interface DeviceLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  isMocked: boolean;
  timestamp?: number;
}

export const getDeviceCurrentLocation = async (
  accuracy: Location.Accuracy = Location.Accuracy.Highest,
  timeoutMs: number = 7000,
): Promise<DeviceLocationResult> => {
  const readiness = await ensureLocationReady({ requestPermission: true, promptAlert: true });
  if (!readiness.permissionGranted) {
    throw new Error('Cần cấp quyền truy cập vị trí để xác thực hiện trường.');
  }
  if (!readiness.servicesEnabled) {
    throw new Error('Vui lòng bật định vị GPS của thiết bị để xác thực hiện trường.');
  }

  const locationPromise = Location.getCurrentPositionAsync({ accuracy });
  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));

  const location = await Promise.race([locationPromise, timeoutPromise]).catch(() => null);
  if (location?.coords) {
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: Math.round(location.coords.accuracy ?? 0),
      isMocked: Boolean(location.mocked),
      timestamp: location.timestamp,
    };
  }

  // Fallback to last known position if real-time GPS acquisition timed out
  const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
  if (lastKnown?.coords) {
    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
      accuracy: Math.round(lastKnown.coords.accuracy ?? 0),
      isMocked: Boolean(lastKnown.mocked),
      timestamp: lastKnown.timestamp,
    };
  }

  throw new Error('Không thể khóa tín hiệu GPS thiết bị. Vui lòng kiểm tra định vị và thử lại.');
};

export interface ExternalNavigationTarget {
  latitude: number;
  longitude: number;
  address?: string | null;
  label?: string | null;
}

/**
 * Mở Google Maps để điều hướng / chỉ đường (Turn-by-Turn Navigation & Directions)
 * trực tiếp từ vị trí hiện tại đến tọa độ điểm hư hỏng mặt đường.
 */
export const openGoogleMapsNavigation = async (
  target: ExternalNavigationTarget,
): Promise<boolean> => {
  const { latitude, longitude } = target;

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    const errorMsg = 'Tọa độ GPS điểm hư hỏng không hợp lệ để chỉ đường.';
    console.warn('[GoogleMapsNavigation]', errorMsg, target);
    if (Platform.OS !== 'web') {
      Alert.alert('Chỉ đường Google Maps', errorMsg);
    }
    return false;
  }

  // Chuẩn hóa định dạng URL Google Maps Directions chính thức
  // Tự động kích hoạt tính năng dẫn đường (Directions) từ GPS hiện tại tới tọa độ đích
  const universalDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;

  // Android Native Google Maps Navigation Intent (Điều hướng từng bước GPS thời gian thực)
  const androidNavUri = `google.navigation:q=${latitude},${longitude}&mode=d`;

  // iOS Schemes
  const iosGoogleMapsUri = `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`;
  const iosAppleMapsUri = `maps://?daddr=${latitude},${longitude}&dirflg=d`;

  try {
    if (Platform.OS === 'android') {
      // 1. Thử mở trực tiếp chế độ GPS Turn-by-Turn của Google Maps trên Android
      try {
        await Linking.openURL(androidNavUri);
        return true;
      } catch {
        // Fallback: Mở Google Maps qua đường dẫn Universal Directions
        await Linking.openURL(universalDirectionsUrl);
        return true;
      }
    }

    if (Platform.OS === 'ios') {
      // 1. Thử mở ứng dụng Google Maps nếu máy iOS đã cài đặt
      try {
        const canOpenGpm = await Linking.canOpenURL(iosGoogleMapsUri);
        if (canOpenGpm) {
          await Linking.openURL(iosGoogleMapsUri);
          return true;
        }
      } catch {
        // bỏ qua
      }

      // 2. Thử mở Apple Maps dẫn đường
      try {
        const canOpenApple = await Linking.canOpenURL(iosAppleMapsUri);
        if (canOpenApple) {
          await Linking.openURL(iosAppleMapsUri);
          return true;
        }
      } catch {
        // bỏ qua
      }

      // 3. Fallback: Mở trình duyệt với liên kết chỉ đường Google Maps
      await Linking.openURL(universalDirectionsUrl);
      return true;
    }

    // Web Platform
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(universalDirectionsUrl, '_blank', 'noopener,noreferrer');
      return true;
    }

    await Linking.openURL(universalDirectionsUrl);
    return true;
  } catch (openErr) {
    console.warn('[GoogleMapsNavigation] Failed to launch navigation:', openErr);
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Không thể mở Google Maps',
        'Vui lòng kiểm tra ứng dụng Google Maps hoặc kết nối mạng trên thiết bị.',
      );
    }
    return false;
  }
};
