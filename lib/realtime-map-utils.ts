import { type Coordinate } from "@/lib/realtime-bus-feed";

const ROUTE_COLORS = [
  "#16a34a",
  "#2563eb",
  "#ea580c",
  "#7c3aed",
  "#db2777",
  "#0f766e",
  "#b45309",
  "#0891b2",
];

type GeoJsonLike = {
  type?: unknown;
  coordinates?: unknown;
  geometry?: {
    type?: unknown;
    coordinates?: unknown;
  };
  features?: unknown;
};

function toCoordinatesList(value: unknown): Coordinate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (point): point is number[] => Array.isArray(point) && point.length >= 2,
    )
    .map((point) => [Number(point[0]), Number(point[1])] as Coordinate)
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
}

export function parseLineStringCoordinatesFromGeoJson(
  value: unknown,
): Coordinate[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const maybeGeoJson = value as GeoJsonLike;

  const directLineCoordinates =
    maybeGeoJson.type === "LineString"
      ? maybeGeoJson.coordinates
      : maybeGeoJson.geometry?.type === "LineString"
        ? maybeGeoJson.geometry.coordinates
        : undefined;

  const directLine = toCoordinatesList(directLineCoordinates);
  if (directLine.length >= 2) {
    return directLine;
  }

  if (
    maybeGeoJson.type !== "FeatureCollection" ||
    !Array.isArray(maybeGeoJson.features)
  ) {
    return [];
  }

  const featureLines = maybeGeoJson.features
    .map((feature) => {
      if (!feature || typeof feature !== "object") {
        return [] as Coordinate[];
      }

      const maybeFeature = feature as {
        geometry?: {
          type?: unknown;
          coordinates?: unknown;
        };
      };

      if (maybeFeature.geometry?.type !== "LineString") {
        return [] as Coordinate[];
      }

      return toCoordinatesList(maybeFeature.geometry.coordinates);
    })
    .filter((coords) => coords.length >= 2)
    .sort((a, b) => b.length - a.length);

  return featureLines[0] ?? [];
}

export function pickRouteColor(index: number): string {
  return ROUTE_COLORS[index % ROUTE_COLORS.length];
}

export function buildBusPopupHtml(
  busId: string,
  passengerCount: number,
  speedKph: number,
): string {
  return (
    `<div class="bus-popup-card">` +
    `<div class="bus-popup-title">${busId}</div>` +
    `<div class="bus-popup-line"><span>Penumpang</span><strong>${passengerCount}</strong></div>` +
    `<div class="bus-popup-line"><span>Kecepatan</span><strong>${speedKph.toFixed(1)} km/j</strong></div>` +
    `</div>`
  );
}
