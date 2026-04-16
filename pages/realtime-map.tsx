import { Manrope, Sora } from "next/font/google";
import { useEffect, useMemo, useRef, useState } from "react";

import { BusStatusCard } from "@/components/realtime-map/BusStatusCard";
import { FleetSummaryCard } from "@/components/realtime-map/FleetSummaryCard";
import { GpsPermissionDialog } from "@/components/realtime-map/GpsPermissionDialog";
import { MapHeader } from "@/components/realtime-map/MapHeader";
import { MapToolbar } from "@/components/realtime-map/MapToolbar";
import { RouteInfoCard } from "@/components/realtime-map/RouteInfoCard";
import {
  type BusTelemetry,
  type Coordinate,
  createRealtimeBusFeed,
} from "@/lib/realtime-bus-feed";

import styles from "./realtime-map.module.css";

const MAP_STYLE_URLS = {
  light: "mapbox://styles/mapbox/light-v11",
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
} as const;

type MapStyleKey = keyof typeof MAP_STYLE_URLS;

type DistanceLookup = {
  cumulative: number[];
  total: number;
};

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const routeCoordinatesSeed: Coordinate[] = [
  [112.6063, -7.9527],
  [112.6102, -7.9525],
  [112.6137, -7.9518],
  [112.6148, -7.9484],
  [112.6152, -7.9469],
  [112.6151, -7.9506],
  [112.6149, -7.9532],
  [112.6215, -7.9574],
  [112.6251, -7.9596],
];

const stopNames = [
  "Halte UIN Malang",
  "Halte Dinoyo",
  "Halte Soekarno Hatta",
  "Halte Veteran UB",
  "Halte Polinema",
  "Halte UM",
  "Halte Tlogomas",
  "Halte Landungsari",
  "Halte Sumbersari",
  "Halte Gajayana",
];

function buildBusPopupHtml(
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

function upsertUserLocationSource(
  map: import("mapbox-gl").Map,
  coords: Coordinate,
) {
  const sourceId = "user-location";
  const outerLayerId = "user-location-outer";
  const innerLayerId = "user-location-inner";
  const data = {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "Point" as const,
          coordinates: coords,
        },
      },
    ],
  };

  const existingSource = map.getSource(sourceId) as
    | import("mapbox-gl").GeoJSONSource
    | undefined;

  if (existingSource) {
    existingSource.setData(data);
    return;
  }

  map.addSource(sourceId, {
    type: "geojson",
    data,
  });

  map.addLayer({
    id: outerLayerId,
    type: "circle",
    source: sourceId,
    paint: {
      "circle-radius": 15,
      "circle-color": "#245bb0",
      "circle-opacity": 0.22,
    },
  });

  map.addLayer({
    id: innerLayerId,
    type: "circle",
    source: sourceId,
    paint: {
      "circle-radius": 7,
      "circle-color": "#245bb0",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
    },
  });
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceInMeters(a: Coordinate, b: Coordinate): number {
  const earthRadius = 6371000;
  const dLat = toRadians(b[1] - a[1]);
  const dLng = toRadians(b[0] - a[0]);

  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function buildDistanceLookup(coords: Coordinate[]): DistanceLookup {
  const cumulative: number[] = [0];

  for (let i = 1; i < coords.length; i += 1) {
    cumulative[i] =
      cumulative[i - 1] + distanceInMeters(coords[i - 1], coords[i]);
  }

  return {
    cumulative,
    total: cumulative[cumulative.length - 1] ?? 0,
  };
}

function pointAtDistance(
  coords: Coordinate[],
  cumulative: number[],
  distance: number,
): Coordinate {
  if (coords.length <= 1 || cumulative.length <= 1) {
    return coords[0] ?? [0, 0];
  }

  if (distance <= 0) {
    return coords[0];
  }

  const routeLength = cumulative[cumulative.length - 1] ?? 0;
  if (distance >= routeLength) {
    return coords[coords.length - 1];
  }

  let segmentIndex = 1;
  while (
    segmentIndex < cumulative.length &&
    cumulative[segmentIndex] < distance
  ) {
    segmentIndex += 1;
  }

  const prevDistance = cumulative[segmentIndex - 1];
  const nextDistance = cumulative[segmentIndex];
  const range = Math.max(nextDistance - prevDistance, 1);
  const ratio = (distance - prevDistance) / range;

  const [lngA, latA] = coords[segmentIndex - 1];
  const [lngB, latB] = coords[segmentIndex];

  return [lngA + (lngB - lngA) * ratio, latA + (latB - latA) * ratio];
}

function buildStopPoints(coords: Coordinate[], lookup: DistanceLookup) {
  if (!coords.length) {
    return [];
  }

  return stopNames.map((name, index) => {
    const progress = index / Math.max(stopNames.length - 1, 1);
    const point = pointAtDistance(
      coords,
      lookup.cumulative,
      lookup.total * progress,
    );
    return { name, coords: point };
  });
}

async function fetchRoadRoute(token: string): Promise<Coordinate[]> {
  const coordinatesString = routeCoordinatesSeed
    .map(([lng, lat]) => `${lng},${lat}`)
    .join(";");

  const endpoint =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesString}` +
    `?geometries=geojson&overview=full&steps=false&access_token=${token}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      return routeCoordinatesSeed;
    }

    const data = (await response.json()) as {
      routes?: Array<{
        geometry?: {
          coordinates?: number[][];
        };
      }>;
    };

    const points = data.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(points) || points.length < 2) {
      return routeCoordinatesSeed;
    }

    const normalized = points
      .filter((point) => Array.isArray(point) && point.length >= 2)
      .map((point) => [Number(point[0]), Number(point[1])] as Coordinate)
      .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

    return normalized.length >= 2 ? normalized : routeCoordinatesSeed;
  } catch {
    return routeCoordinatesSeed;
  }
}

export default function RealtimeMapPage() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<import("mapbox-gl").Map | null>(null);
  const activeBusIdRef = useRef<string | null>(null);
  const userLocationRef = useRef<Coordinate | null>(null);
  const [currentStop, setCurrentStop] = useState("Shelter Asrama");
  const [eta, setEta] = useState(3);
  const [speedKph, setSpeedKph] = useState(0);
  const [passengerCount, setPassengerCount] = useState(0);
  const [gpsDialogOpen, setGpsDialogOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [busLabel, setBusLabel] = useState("Bus A12");
  const [activeBusId, setActiveBusId] = useState<string | null>(null);
  const [activeBusCount, setActiveBusCount] = useState(0);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("light");
  const [isTiltedView, setIsTiltedView] = useState(true);
  const feedMode =
    process.env.NEXT_PUBLIC_BUS_FEED_MODE === "mqtt" ? "mqtt" : "mock";

  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const handleRequestGpsAccess = () => {
    if (!navigator.geolocation) {
      setGpsError("Browser tidak mendukung GPS/geolocation.");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinate = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        userLocationRef.current = coords;
        setUserLocation(coords);
        setGpsLoading(false);
        setGpsDialogOpen(false);

        const map = mapInstanceRef.current;
        if (map) {
          upsertUserLocationSource(map, coords);
          map.easeTo({
            center: coords,
            duration: 900,
            zoom: Math.max(map.getZoom(), 15.2),
            essential: true,
          });
        }
      },
      (error) => {
        setGpsLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError("Akses lokasi ditolak. Izinkan GPS untuk melanjutkan.");
          return;
        }

        if (error.code === error.TIMEOUT) {
          setGpsError("Waktu permintaan lokasi habis. Coba lagi.");
          return;
        }

        setGpsError("Lokasi tidak tersedia saat ini. Coba beberapa saat lagi.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      },
    );
  };

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (!token) {
      setTokenMissing(true);
      return;
    }
    setTokenMissing(false);

    let map: import("mapbox-gl").Map | null = null;
    let stopFeed: (() => void) | null = null;
    let popup: import("mapbox-gl").Popup | null = null;
    let lastCameraFollowAt = 0;
    let mounted = true;

    const initMap = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = token;

      const roadRoute = await fetchRoadRoute(token);
      const lookup = buildDistanceLookup(roadRoute);
      const stopPoints = buildStopPoints(roadRoute, lookup);
      const centerPoint =
        roadRoute[Math.floor(roadRoute.length / 2)] ?? roadRoute[0];

      map = new mapboxgl.Map({
        container: mapRef.current as HTMLDivElement,
        style: MAP_STYLE_URLS[mapStyle],
        center: centerPoint,
        zoom: 14.8,
        pitch: isTiltedView ? 52 : 0,
        bearing: isTiltedView ? -22 : 0,
        antialias: true,
      });
      mapInstanceRef.current = map;

      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: true }),
        "top-right",
      );

      map.on("load", () => {
        if (!map || !mounted) {
          return;
        }

        map.addSource("bus-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: roadRoute,
            },
          },
        });

        map.addSource("stops", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: stopPoints.map((stop) => ({
              type: "Feature",
              properties: {
                name: stop.name,
              },
              geometry: {
                type: "Point",
                coordinates: stop.coords,
              },
            })),
          },
        });

        map.addSource("bus-point", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        const bounds = new mapboxgl.LngLatBounds();
        roadRoute.forEach(([lng, lat]) => {
          bounds.extend([lng, lat]);
        });
        map.fitBounds(bounds, {
          padding: 56,
          duration: 800,
          maxZoom: 16.2,
          pitch: isTiltedView ? 52 : 0,
          bearing: isTiltedView ? -22 : 0,
        });

        if (userLocationRef.current) {
          upsertUserLocationSource(map, userLocationRef.current);
        }

        map.addLayer({
          id: "bus-route-glow",
          type: "line",
          source: "bus-route",
          paint: {
            "line-color": "#e86f3f",
            "line-width": 14,
            "line-opacity": 0.25,
          },
        });

        map.addLayer({
          id: "bus-route-line",
          type: "line",
          source: "bus-route",
          paint: {
            "line-color": "#ffe39f",
            "line-width": 5,
            "line-opacity": 0.95,
            "line-dasharray": [1.6, 1.2],
          },
        });

        map.addLayer({
          id: "stops-circle",
          type: "circle",
          source: "stops",
          paint: {
            "circle-radius": 7,
            "circle-color": "#62f4da",
            "circle-stroke-color": "#102b28",
            "circle-stroke-width": 2,
          },
        });

        map.addLayer({
          id: "stops-label",
          type: "symbol",
          source: "stops",
          layout: {
            "text-field": ["get", "name"],
            "text-size": 12,
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-offset": [0, 1.5],
          },
          paint: {
            "text-color": "#173330",
            "text-halo-color": "#fff9ed",
            "text-halo-width": 1,
          },
        });

        map.addLayer({
          id: "bus-points",
          type: "circle",
          source: "bus-point",
          paint: {
            "circle-radius": 10,
            "circle-color": "#e86f3f",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffe39f",
          },
        });

        map.addLayer({
          id: "bus-labels",
          type: "symbol",
          source: "bus-point",
          layout: {
            "text-field": ["get", "busId"],
            "text-size": 11,
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-offset": [0, 1.6],
          },
          paint: {
            "text-color": "#173330",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1,
          },
        });

        map.on("mouseenter", "bus-points", () => {
          if (!map) {
            return;
          }
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "bus-points", () => {
          if (!map) {
            return;
          }
          map.getCanvas().style.cursor = "";
        });

        map.on("click", "bus-points", (event) => {
          if (!map) {
            return;
          }

          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") {
            return;
          }

          const coordinates = [...feature.geometry.coordinates] as [
            number,
            number,
          ];
          const props = feature.properties ?? {};
          const selectedBusId = String(props.busId ?? "-");
          const selectedStop = String(props.nearestStop ?? "-");
          const selectedEta = Number(props.etaMinutes ?? 0);
          const selectedSpeed = Number(props.speedKph ?? 0);
          const selectedPassenger = Number(props.passengerCount ?? 0);

          activeBusIdRef.current = selectedBusId;
          setActiveBusId(selectedBusId);
          setBusLabel(selectedBusId);
          setCurrentStop(selectedStop);
          setEta(Number.isFinite(selectedEta) ? selectedEta : 0);
          setSpeedKph(Number.isFinite(selectedSpeed) ? selectedSpeed : 0);
          setPassengerCount(
            Number.isFinite(selectedPassenger) ? selectedPassenger : 0,
          );

          popup?.remove();
          popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnMove: false,
            offset: 16,
            className: "bus-info-popup",
          })
            .setLngLat(coordinates)
            .setHTML(
              buildBusPopupHtml(
                selectedBusId,
                selectedPassenger,
                selectedSpeed,
              ),
            )
            .addTo(map);
        });

        const feed = createRealtimeBusFeed({
          mode: feedMode,
          mqttBrokerUrl: process.env.NEXT_PUBLIC_MQTT_BROKER_URL,
          mqttTopic: process.env.NEXT_PUBLIC_MQTT_TOPIC,
        });

        const busesById = new Map<string, BusTelemetry>();

        stopFeed = feed.connect(
          (payload) => {
            if (!map || !mounted) {
              return;
            }

            busesById.set(payload.busId, payload);
            setActiveBusCount(busesById.size);

            if (!activeBusIdRef.current) {
              activeBusIdRef.current = payload.busId;
              setActiveBusId(payload.busId);
            }

            const shouldSyncPanel =
              (activeBusIdRef.current ?? payload.busId) === payload.busId;
            if (shouldSyncPanel) {
              setBusLabel(payload.busId);
              setCurrentStop(payload.nearestStop);
              setEta(payload.etaMinutes);
              setSpeedKph(payload.speedKph);
              setPassengerCount(payload.passengerCount);
            }

            const selectedBusId = activeBusIdRef.current;
            const selectedBus = selectedBusId
              ? busesById.get(selectedBusId)
              : undefined;

            if (popup && selectedBus) {
              popup
                .setLngLat(selectedBus.position)
                .setHTML(
                  buildBusPopupHtml(
                    selectedBus.busId,
                    selectedBus.passengerCount,
                    selectedBus.speedKph,
                  ),
                );

              const now = Date.now();
              if (now - lastCameraFollowAt > 450) {
                map.easeTo({
                  center: selectedBus.position,
                  duration: 650,
                  essential: true,
                });
                lastCameraFollowAt = now;
              }
            }

            const features = Array.from(busesById.values()).map((bus) => ({
              type: "Feature" as const,
              properties: {
                busId: bus.busId,
                nearestStop: bus.nearestStop,
                etaMinutes: bus.etaMinutes,
                speedKph: bus.speedKph,
                passengerCount: bus.passengerCount,
              },
              geometry: {
                type: "Point" as const,
                coordinates: bus.position,
              },
            }));

            const source = map.getSource("bus-point") as
              | import("mapbox-gl").GeoJSONSource
              | undefined;

            source?.setData({
              type: "FeatureCollection",
              features,
            });
          },
          {
            routeCoordinates: roadRoute,
            stopNames,
            loopDurationSeconds: 80,
            busCount: 2,
          },
        );
      });
    };

    initMap();

    return () => {
      mounted = false;
      stopFeed?.();
      popup?.remove();
      map?.remove();
      mapInstanceRef.current = null;
    };
  }, [feedMode, isTiltedView, mapStyle, token]);

  const statusLabel = useMemo(() => {
    if (eta <= 2) {
      return "Hampir tiba";
    }
    if (eta <= 5) {
      return "On schedule";
    }
    return "Perjalanan normal";
  }, [eta]);

  return (
    <div
      className={`${sora.variable} ${manrope.variable} min-h-screen bg-[#f7f9ff] text-[#173330]`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`${styles.auroraMesh} absolute inset-0`} />
        <div
          className={`${styles.gradientOrb} ${styles.orbA} absolute -top-20 left-1/4 h-72 w-72 rounded-full`}
        />
        <div
          className={`${styles.gradientOrb} ${styles.orbB} absolute bottom-0 -right-16 h-80 w-80 rounded-full`}
        />
        <div
          className={`${styles.gradientOrb} ${styles.orbC} absolute top-1/3 -left-20 h-64 w-64 rounded-full`}
        />
      </div>

      <main className="relative mx-auto w-full max-w-7xl px-5 py-8 md:px-10 lg:px-16">
        <MapHeader />

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="overflow-hidden rounded-[2rem] border border-[#245bb0]/16 bg-white/85 shadow-[0_18px_44px_rgba(36,91,176,0.12)]">
            <div className="border-b border-[#245bb0]/10 bg-linear-to-r from-[#eef5ff]/60 to-[#ebfdfa]/50 px-5 py-4 text-sm text-[#173330]/70">
              Tracking rute kampus utama • Update simulasi setiap frame
            </div>
            <MapToolbar
              isTiltedView={isTiltedView}
              mapStyle={mapStyle}
              onOpenGpsDialog={() => setGpsDialogOpen(true)}
              onToggleTiltedView={() => setIsTiltedView((prev) => !prev)}
              onSetMapStyle={setMapStyle}
            />
            {tokenMissing ? (
              <div className="flex min-h-125 flex-col items-center justify-center gap-4 px-6 text-center">
                <p
                  style={{ fontFamily: "var(--font-display)" }}
                  className="text-3xl font-semibold text-[#e86f3f]"
                >
                  Token Mapbox Belum Diatur
                </p>
                <p className="max-w-lg text-sm leading-7 text-[#173330]/75">
                  Tambahkan NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN di file .env.local
                  agar peta realtime dapat ditampilkan.
                </p>
              </div>
            ) : (
              <div
                ref={mapRef}
                className={`${styles.mapContainer} min-h-125 w-full`}
              />
            )}
          </article>

          <aside className="space-y-4">
            <BusStatusCard
              busLabel={busLabel}
              currentStop={currentStop}
              eta={eta}
              speedKph={speedKph}
              passengerCount={passengerCount}
              userLocation={userLocation}
              statusLabel={statusLabel}
            />
            <RouteInfoCard stopNames={stopNames} />
            <FleetSummaryCard
              activeBusCount={activeBusCount}
              feedMode={feedMode}
            />
          </aside>
        </section>
      </main>

        <Dialog open={gpsDialogOpen} onOpenChange={setGpsDialogOpen}>
          <DialogContent className="max-w-lg rounded-2xl border border-[#245bb0]/16 bg-white/95">
            <DialogHeader>
              <DialogTitle className="text-xl text-[#173330]">
                Izinkan Akses Lokasi GPS
              </DialogTitle>
              <DialogDescription className="text-sm leading-7 text-[#173330]/70">
                Buswy membutuhkan lokasi kamu untuk menampilkan titik posisi saat
                ini di peta realtime dan membantu estimasi kedekatan bus.
              </DialogDescription>
            </DialogHeader>

            {gpsError ? (
              <p className="rounded-xl border border-[#e86f3f]/25 bg-[#fff4ef] px-4 py-3 text-sm text-[#b3451c]">
                {gpsError}
              </p>
            ) : null}

            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => setGpsDialogOpen(false)}
              >
                Nanti Saja
              </Button>
              <Button
                type="button"
                onClick={handleRequestGpsAccess}
                disabled={gpsLoading}
                className="bg-[#173330] text-[#f4f1e8] hover:bg-[#112927]"
              >
                {gpsLoading ? "Meminta Akses..." : "Izinkan GPS"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <style jsx>{`
          .aurora-mesh {
            background:
              radial-gradient(
                circle at 14% 16%,
                rgba(122, 183, 255, 0.34),
                transparent 32%
              ),
              radial-gradient(
                circle at 82% 20%,
                rgba(98, 244, 218, 0.28),
                transparent 35%
              ),
              radial-gradient(
                circle at 50% 82%,
                rgba(255, 177, 102, 0.2),
                transparent 30%
              );
            animation: mesh-float 14s ease-in-out infinite alternate;
          }

          .gradient-orb {
            filter: blur(56px);
            opacity: 0.5;
            animation: orb-drift 18s ease-in-out infinite;
          }

          .orb-a {
            background: #8bc6ff;
          }

          .orb-b {
            background: #a4f4eb;
            animation-delay: 2s;
          }

          .orb-c {
            background: #ffd7a8;
            animation-delay: 4s;
          }

          .map-container {
            position: relative;
          }

          .map-container :global(.mapboxgl-ctrl button) {
            background: #f7f9ff;
          }

          .map-container :global(.mapboxgl-ctrl button span) {
            filter: invert(20%);
          }

          .map-container :global(.bus-info-popup .mapboxgl-popup-content) {
            border-radius: 14px;
            border: 1px solid rgba(36, 91, 176, 0.18);
            background: #ffffff;
            box-shadow: 0 14px 30px rgba(36, 91, 176, 0.16);
            padding: 0;
          }

          .map-container :global(.bus-info-popup .mapboxgl-popup-tip) {
            border-top-color: #ffffff;
            border-bottom-color: #ffffff;
          }

          .map-container :global(.bus-popup-card) {
            min-width: 190px;
            padding: 12px 14px;
            color: #173330;
          }

          .map-container :global(.bus-popup-title) {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #245bb0;
            margin-bottom: 8px;
          }

          .map-container :global(.bus-popup-line) {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            font-size: 13px;
            margin-top: 4px;
          }

          .map-container :global(.bus-popup-line strong) {
            font-weight: 700;
          }

          @keyframes mesh-float {
            0% {
              transform: scale(1) translate3d(0, 0, 0);
            }
            100% {
              transform: scale(1.08) translate3d(1.5%, -1%, 0);
            }
          }

          @keyframes orb-drift {
            0%,
            100% {
              transform: translate3d(0, 0, 0) scale(1);
            }
            50% {
              transform: translate3d(1rem, -0.7rem, 0) scale(1.07);
            }
          }
        `}</style>
      </div>
      <GpsPermissionDialog
        open={gpsDialogOpen}
        onOpenChange={setGpsDialogOpen}
        gpsError={gpsError}
        gpsLoading={gpsLoading}
        onRequestGpsAccess={handleRequestGpsAccess}
      />
    </div>
  );
}
