import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { Manrope, Sora } from "next/font/google";
import { useEffect, useMemo, useRef, useState } from "react";

import { FloatingMapControls } from "@/components/realtime-map/FloatingMapControls";
import { GpsPermissionDialog } from "@/components/realtime-map/GpsPermissionDialog";
import { useRealtimeMapRenderer } from "@/lib/hooks/use-realtime-map-renderer";
import { prisma } from "@/lib/prisma";
import type { Coordinate } from "@/lib/realtime-bus-feed";
import {
  type MapStyleKey,
  type RealtimeMapRoute,
  type RealtimeMapStation,
} from "@/lib/realtime-map-types";
import { parseLineStringCoordinatesFromGeoJson } from "@/lib/realtime-map-utils";

import styles from "./realtime-map.module.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

type RealtimeMapPageProps = {
  routes: RealtimeMapRoute[];
  busesActive: Array<{
    id: string;
    busCode: string | null;
  }>;
};

export default function RealtimeMapPage({
  routes,
  busesActive,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const userLocationRef = useRef<Coordinate | null>(null);
  const [gpsDialogOpen, setGpsDialogOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("light");
  const [isTiltedView, setIsTiltedView] = useState(true);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);

  const activeRoute = routes[0] ?? null;
  const activeRouteCoordinates = activeRoute?.coordinates ?? [];
  const activeRouteStations = activeRoute?.stations ?? [];
  const activeStopNames = useMemo(
    () => activeRoute?.stations.map((station) => station.name) ?? [],
    [activeRoute],
  );
  const allStations = useMemo(() => {
    const deduped = new Map<string, RealtimeMapStation>();

    routes.forEach((route) => {
      route.stations.forEach((station) => {
        if (!deduped.has(station.id)) {
          deduped.set(station.id, station);
        }
      });
    });

    return Array.from(deduped.values());
  }, [routes]);
  const hasMapData =
    routes.some((route) => route.coordinates.length >= 2) ||
    allStations.length > 0;
  const busCodeById = useMemo(
    () =>
      Object.fromEntries(
        busesActive.map((bus) => [bus.id, bus.busCode ?? bus.id]),
      ),
    [busesActive],
  );

  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const { mapInstanceRef, upsertUserLocationSource } = useRealtimeMapRenderer({
    mapRef,
    routes,
    busCodeById,
    activeRouteStations,
    activeRouteId: activeRoute?.id ?? null,
    activeRouteCoordinates,
    activeStopNames,
    allStations,
    hasMapData,
    mapStyle,
    isTiltedView,
    token,
    userLocationRef,
    onTokenMissingChange: setTokenMissing,
  });

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
    const handleOutsideClick = (event: MouseEvent) => {
      if (!isViewMenuOpen) {
        return;
      }

      const target = event.target as Node;
      const clickedMenu = menuRef.current?.contains(target) ?? false;
      const clickedTrigger = menuTriggerRef.current?.contains(target) ?? false;

      if (!clickedMenu && !clickedTrigger) {
        setIsViewMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isViewMenuOpen]);

  return (
    <div
      className={`${sora.variable} ${manrope.variable} h-screen w-screen overflow-hidden bg-[#f7f9ff] text-[#173330]`}
    >
      <div className="absolute inset-0">
        <div
          ref={mapRef}
          className={`${styles.mapContainer} h-screen w-screen`}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-20">
        <FloatingMapControls
          isViewMenuOpen={isViewMenuOpen}
          isTiltedView={isTiltedView}
          mapStyle={mapStyle}
          menuRef={menuRef}
          menuTriggerRef={menuTriggerRef}
          onToggleViewMenu={() => setIsViewMenuOpen((prev) => !prev)}
          onToggleTiltedView={() => setIsTiltedView((prev) => !prev)}
          onSelectMapStyle={setMapStyle}
          onOpenGpsDialog={() => {
            setIsViewMenuOpen(false);
            setGpsDialogOpen(true);
          }}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 md:p-6">
          <div className="mx-auto max-w-max rounded-md border border-slate-200/80 bg-white/88 px-2 py-1 text-xs text-slate-600 shadow-sm backdrop-blur-sm">
            Tap ikon bus untuk detail
          </div>
        </div>

        {tokenMissing ? (
          <div className="pointer-events-auto absolute inset-x-4 top-1/2 z-30 -translate-y-1/2 rounded-xl border border-slate-200/90 bg-white/95 p-6 text-center shadow-sm backdrop-blur-sm md:inset-x-auto md:left-1/2 md:w-136 md:-translate-x-1/2">
            <p
              style={{ fontFamily: "var(--font-display)" }}
              className="text-3xl font-semibold text-[#e86f3f]"
            >
              Token Mapbox Belum Diatur
            </p>
            <p className="mt-3 text-sm leading-7 text-[#173330]/75">
              Tambahkan NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN di file .env.local agar
              peta realtime dapat ditampilkan.
            </p>
          </div>
        ) : null}

        {!tokenMissing && !hasMapData ? (
          <div className="pointer-events-auto absolute inset-x-4 top-1/2 z-30 -translate-y-1/2 rounded-xl border border-slate-200/90 bg-white/95 p-6 text-center shadow-sm backdrop-blur-sm md:inset-x-auto md:left-1/2 md:w-136 md:-translate-x-1/2">
            <p
              style={{ fontFamily: "var(--font-display)" }}
              className="text-3xl font-semibold text-[#e86f3f]"
            >
              Data Rute Belum Tersedia
            </p>
            <p className="mt-3 text-sm leading-7 text-[#173330]/75">
              Tambahkan data route dengan GeoJSON LineString dan station di
              database agar peta realtime dapat ditampilkan.
            </p>
          </div>
        ) : null}
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

export const getServerSideProps: GetServerSideProps<
  RealtimeMapPageProps
> = async (context) => {
  const routeIdQuery = context.query.routeId;
  const routeId =
    typeof routeIdQuery === "string" && routeIdQuery.trim().length > 0
      ? routeIdQuery
      : null;

  const routeRecords = await prisma.route.findMany({
    where: routeId ? { id: routeId } : undefined,
    orderBy: {
      routeName: "asc",
    },
    include: {
      stations: {
        include: {
          station: {
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  const routes: RealtimeMapRoute[] = routeRecords.map((route) => {
    const coordinates = parseLineStringCoordinatesFromGeoJson(
      route.pathGeoJSON,
    );
    const relationStations = route.stations.map((item) => ({
      id: item.station.id,
      name: item.station.name,
      latitude: item.station.latitude,
      longitude: item.station.longitude,
      order: item.order,
    }));

    return {
      id: route.id,
      routeName: route.routeName,
      coordinates,
      stations: relationStations,
    };
  });

  const busesActive = await prisma.bus.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      plateNumber: true,
      busCode: true,
      route: {
        select: {
          id: true,
          routeName: true,
        },
      },
      passengerCount: true,
      maxPassengers: true,
    },
  });

  return {
    props: {
      routes,
      busesActive,
    },
  };
};
