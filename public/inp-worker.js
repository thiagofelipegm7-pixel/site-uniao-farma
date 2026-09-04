const EARTH_RADIUS_KM = 6371;

function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(from, to) {
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

self.onmessage = (event) => {
  const message = event.data || {};

  if (message.type === "rank") {
    const origin = message.origin;
    const ranked = (message.units || [])
      .filter((unit) => unit && unit.coordinates)
      .map((unit) => ({
        id: unit.id,
        distanceKm: distanceKm(origin, unit.coordinates),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    self.postMessage({ type: "rank", requestId: message.requestId, ranked });
    return;
  }

  if (message.type === "metric" && message.payload) {
    const body = JSON.stringify(message.payload);
    fetch("/api/metricas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
};
