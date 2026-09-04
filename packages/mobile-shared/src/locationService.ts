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

export const preloadUserLocation = async (): Promise<CachedUserLocation | null> => {
  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = (async () => {
    try {
      const lastKnownLocation = await Location.getLastKnownPositionAsync();
      const mappedLastKnownLocation = toCachedUserLocation(lastKnownLocation);

      if (mappedLastKnownLocation) {
        cachedUserLocation = mappedLastKnownLocation;
      }

      const permission = await Location.getForegroundPermissionsAsync();

      if (!permission.granted) {
        return cachedUserLocation;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const mappedCurrentLocation = toCachedUserLocation(currentLocation);

      if (mappedCurrentLocation) {
        cachedUserLocation = mappedCurrentLocation;
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

export const getOrLoadUserLocation = async (): Promise<CachedUserLocation | null> => {
  if (cachedUserLocation) {
    return cachedUserLocation;
  }

  return preloadUserLocation();
};
