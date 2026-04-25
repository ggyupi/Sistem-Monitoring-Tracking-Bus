import type { Coordinate } from "@/lib/realtime-bus-feed";

export const MAP_STYLE_URLS = {
  light: "mapbox://styles/mapbox/light-v11",
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
} as const;

export type MapStyleKey = keyof typeof MAP_STYLE_URLS;

export type RealtimeMapStation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
};

export type RealtimeMapRoute = {
  id: string;
  routeName: string;
  coordinates: Coordinate[];
  stations: RealtimeMapStation[];
};
