import {
  isFreshCache,
  readCachedOrigin,
  writeCachedOrigin,
  type GeoPoint,
} from "./geo";

let inflight: Promise<GeoPoint | null> | null = null;

export function requestBrowserOrigin(force = false): Promise<GeoPoint | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  const cached = readCachedOrigin();
  if (!force && cached && isFreshCache(cached.savedAt)) return Promise.resolve(cached);
  if (inflight) return inflight;

  inflight = new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(cached);
      inflight = null;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = writeCachedOrigin(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          position.coords.accuracy,
        );
        window.dispatchEvent(new CustomEvent("uf-origin", { detail: origin }));
        resolve(origin);
        inflight = null;
      },
      () => {
        resolve(cached);
        inflight = null;
      },
      {
        enableHighAccuracy: false,
        timeout: 800,
        maximumAge: force ? 0 : 45 * 60 * 1000,
      },
    );
  });

  return inflight;
}

export function scheduleAutoLocation(onOrigin: (origin: GeoPoint) => void) {
  if (typeof window === "undefined") return () => {};

  const cached = readCachedOrigin();
  if (cached) onOrigin(cached);

  const start = () => {
    void requestBrowserOrigin(Boolean(cached && !isFreshCache(cached.savedAt))).then((origin) => {
      if (origin) onOrigin(origin);
    });
  };

  const idle =
    "requestIdleCallback" in window
      ? window.requestIdleCallback(start, { timeout: 2500 })
      : globalThis.setTimeout(start, 1200);

  const onEvent = (event: Event) => {
    const origin = (event as CustomEvent<GeoPoint>).detail;
    if (origin) onOrigin(origin);
  };
  window.addEventListener("uf-origin", onEvent);

  return () => {
    window.removeEventListener("uf-origin", onEvent);
    if ("cancelIdleCallback" in window) window.cancelIdleCallback(idle as number);
    window.clearTimeout(idle);
  };
}
