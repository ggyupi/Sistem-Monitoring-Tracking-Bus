import type { MutableRefObject, RefObject } from "react";
import { useEffect, useRef } from "react";

import {
  type BusTelemetry,
  type Coordinate,
  createRealtimeBusFeed,
} from "@/lib/realtime-bus-feed";
import {
  MAP_STYLE_URLS,
  type MapStyleKey,
  type RealtimeMapRoute,
  type RealtimeMapStation,
} from "@/lib/realtime-map-types";
import { buildBusPopupHtml, pickRouteColor } from "@/lib/realtime-map-utils";

type UseRealtimeMapRendererParams = {
  mapRef: RefObject<HTMLDivElement | null>;
  routes: RealtimeMapRoute[];
  activeRouteId: string | null;
  activeRouteCoordinates: Coordinate[];
  activeStopNames: string[];
  allStations: RealtimeMapStation[];
  hasMapData: boolean;
  mapStyle: MapStyleKey;
  isTiltedView: boolean;
  token?: string;
  feedMode: "mock" | "mqtt";
  userLocationRef: MutableRefObject<Coordinate | null>;
  onTokenMissingChange: (value: boolean) => void;
};

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

export function useRealtimeMapRenderer({
  mapRef,
  routes,
  activeRouteId,
  activeRouteCoordinates,
  activeStopNames,
  allStations,
  hasMapData,
  mapStyle,
  isTiltedView,
  token,
  feedMode,
  userLocationRef,
  onTokenMissingChange,
}: UseRealtimeMapRendererParams) {
  const mapInstanceRef = useRef<import("mapbox-gl").Map | null>(null);
  const activeBusIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (!hasMapData) {
      return;
    }

    if (!token) {
      onTokenMissingChange(true);
      return;
    }
    onTokenMissingChange(false);

    let map: import("mapbox-gl").Map | null = null;
    let stopFeed: (() => void) | null = null;
    let popup: import("mapbox-gl").Popup | null = null;
    let lastCameraFollowAt = 0;
    let mounted = true;

    const initMap = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = token;

      const routesWithRoadGeometry = routes.map((route, index) => ({
        ...route,
        drawCoordinates: route.coordinates,
        routeColor: pickRouteColor(index),
        routeIndex: index + 1,
      }));

      const routeLineFeatures = routesWithRoadGeometry
        .filter((route) => route.drawCoordinates.length >= 2)
        .map((route) => ({
          type: "Feature" as const,
          properties: {
            routeId: route.id,
            routeName: route.routeName,
            routeColor: route.routeColor,
            routeIndex: route.routeIndex,
          },
          geometry: {
            type: "LineString" as const,
            coordinates: route.drawCoordinates,
          },
        }));

      const activeRouteFeature = routeLineFeatures.find(
        (feature) => feature.properties.routeId === activeRouteId,
      );
      const feedCoordinates =
        activeRouteFeature?.geometry.coordinates ?? activeRouteCoordinates;

      const centerPoint: Coordinate | null =
        feedCoordinates.length > 0
          ? feedCoordinates[Math.floor(feedCoordinates.length / 2)]
          : allStations.length > 0
            ? [allStations[0].longitude, allStations[0].latitude]
            : null;

      if (!centerPoint) {
        return;
      }

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
            type: "FeatureCollection",
            features: routeLineFeatures,
          },
        });

        map.addSource("stops", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: allStations.map((station) => ({
              type: "Feature",
              properties: {
                name: station.name,
              },
              geometry: {
                type: "Point",
                coordinates: [station.longitude, station.latitude],
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
        routeLineFeatures.forEach((feature) => {
          feature.geometry.coordinates.forEach(([lng, lat]) => {
            bounds.extend([lng, lat]);
          });
        });
        allStations.forEach((station) => {
          bounds.extend([station.longitude, station.latitude]);
        });

        if (bounds.isEmpty()) {
          bounds.extend(centerPoint);
        }

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
            "line-color": ["coalesce", ["get", "routeColor"], "#16a34a"],
            "line-width": 14,
            "line-opacity": 0.25,
          },
        });

        map.addLayer({
          id: "bus-route-line",
          type: "line",
          source: "bus-route",
          paint: {
            "line-color": ["coalesce", ["get", "routeColor"], "#16a34a"],
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
          const selectedSpeed = Number(props.speedKph ?? 0);
          const selectedPassenger = Number(props.passengerCount ?? 0);

          activeBusIdRef.current = selectedBusId;

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

            if (!activeBusIdRef.current) {
              activeBusIdRef.current = payload.busId;
            }

            const shouldSyncPanel =
              (activeBusIdRef.current ?? payload.busId) === payload.busId;

            const selectedBusId = activeBusIdRef.current;
            const selectedBus = selectedBusId
              ? busesById.get(selectedBusId)
              : undefined;

            if (popup && selectedBus && shouldSyncPanel) {
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
            routeCoordinates: feedCoordinates,
            stopNames: activeStopNames,
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
  }, [
    activeRouteCoordinates,
    activeRouteId,
    activeStopNames,
    allStations,
    feedMode,
    hasMapData,
    isTiltedView,
    mapRef,
    mapStyle,
    onTokenMissingChange,
    routes,
    token,
    userLocationRef,
  ]);

  return {
    mapInstanceRef,
    upsertUserLocationSource,
  };
}
