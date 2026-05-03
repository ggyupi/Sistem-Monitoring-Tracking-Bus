import mqtt from "mqtt";

export type Coordinate = [number, number];

export type BusTelemetryStatus = "IN_TRANSIT" | "NEAR_ARRIVAL";

export type BusTelemetry = {
  busId: string;
  busCode?: string;
  position: Coordinate;
  nearestStop: string;
  etaMinutes: number;
  speedKph: number;
  speed?: number;
  alt?: number;
  course?: number;
  sat?: number;
  hdop?: number;
  valid?: boolean;
  datetime?: string;
  passengerCount: number;
  status: BusTelemetryStatus;
  timestamp: number;
};

export type FeedContext = {
  routeCoordinates: Coordinate[];
  stopNames: string[];
  routeStops?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    order: number;
  }>;
  loopDurationSeconds?: number;
  busCount?: number;
};

export type RealtimeFeedCallback = (payload: BusTelemetry) => void;
export type RealtimeFeedUnsubscribe = () => void;

export interface RealtimeFeedAdapter {
  connect(
    onMessage: RealtimeFeedCallback,
    context: FeedContext,
  ): RealtimeFeedUnsubscribe;
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

function cumulativeDistance(coords: Coordinate[]): number[] {
  const cumulative: number[] = [0];
  for (let i = 1; i < coords.length; i += 1) {
    cumulative[i] =
      cumulative[i - 1] + distanceInMeters(coords[i - 1], coords[i]);
  }
  return cumulative;
}

function pointAtDistance(
  coords: Coordinate[],
  cumulative: number[],
  distance: number,
): Coordinate {
  if (coords.length <= 1) {
    return coords[0] ?? [0, 0];
  }

  if (distance <= 0) {
    return coords[0];
  }

  const total = cumulative[cumulative.length - 1] ?? 0;
  if (distance >= total) {
    return coords[coords.length - 1];
  }

  let segmentIndex = 1;
  while (
    segmentIndex < cumulative.length &&
    cumulative[segmentIndex] < distance
  ) {
    segmentIndex += 1;
  }

  const prev = cumulative[segmentIndex - 1];
  const next = cumulative[segmentIndex];
  const ratio = (distance - prev) / Math.max(next - prev, 1);

  const [lngA, latA] = coords[segmentIndex - 1];
  const [lngB, latB] = coords[segmentIndex];

  return [lngA + (lngB - lngA) * ratio, latA + (latB - latA) * ratio];
}

function projectPointToSegment(
  point: Coordinate,
  a: Coordinate,
  b: Coordinate,
): { projected: Coordinate; t: number; distance: number } {
  const ax = a[0];
  const ay = a[1];
  const bx = b[0];
  const by = b[1];
  const px = point[0];
  const py = point[1];

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLengthSquared = abx * abx + aby * aby;
  const t =
    abLengthSquared <= 0
      ? 0
      : clamp((apx * abx + apy * aby) / abLengthSquared, 0, 1);
  const projected: Coordinate = [ax + abx * t, ay + aby * t];
  return {
    projected,
    t,
    distance: distanceInMeters(point, projected),
  };
}

function statusFromEta(
  etaMinutes: number,
  isNearStop: boolean,
): BusTelemetryStatus {
  return isNearStop || etaMinutes <= 2 ? "NEAR_ARRIVAL" : "IN_TRANSIT";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildStopWaypoints(context: FeedContext, cumulative: number[]) {
  const routeStops = (context.routeStops ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((stop) => {
      const stopCoordinate: Coordinate = [stop.longitude, stop.latitude];
      let bestProgress = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let index = 1; index < context.routeCoordinates.length; index += 1) {
        const a = context.routeCoordinates[index - 1];
        const b = context.routeCoordinates[index];
        const projection = projectPointToSegment(stopCoordinate, a, b);
        if (projection.distance < bestDistance) {
          bestDistance = projection.distance;
          bestProgress =
            (cumulative[index - 1] ?? 0) +
            distanceInMeters(a, projection.projected);
        }
      }

      return {
        name: stop.name,
        progress: bestProgress,
        coordinate: stopCoordinate,
      };
    })
    .sort((a, b) => a.progress - b.progress);

  if (routeStops.length > 0) {
    return routeStops;
  }

  const fallbackStops = context.stopNames.map((name, index) => ({
    name,
    progress:
      (cumulative[cumulative.length - 1] ?? 0) *
      (index / Math.max(context.stopNames.length - 1, 1)),
    coordinate: context.routeCoordinates[index] ??
      context.routeCoordinates[0] ?? [0, 0],
  }));

  return fallbackStops;
}

function findNearestRouteProgress(
  point: Coordinate,
  routeCoordinates: Coordinate[],
  cumulative: number[],
): { progress: number; projected: Coordinate; distance: number } {
  if (routeCoordinates.length <= 1) {
    return {
      progress: 0,
      projected: routeCoordinates[0] ?? [0, 0],
      distance: routeCoordinates[0]
        ? distanceInMeters(point, routeCoordinates[0])
        : 0,
    };
  }

  let bestProgress = 0;
  let bestProjected: Coordinate = routeCoordinates[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < routeCoordinates.length; index += 1) {
    const start = routeCoordinates[index - 1];
    const end = routeCoordinates[index];
    const projection = projectPointToSegment(point, start, end);
    if (projection.distance < bestDistance) {
      bestDistance = projection.distance;
      bestProjected = projection.projected;
      bestProgress =
        (cumulative[index - 1] ?? 0) +
        distanceInMeters(start, projection.projected);
    }
  }

  return {
    progress: bestProgress,
    projected: bestProjected,
    distance: bestDistance,
  };
}

function findNearestStopAndEta(
  busPosition: Coordinate,
  routeCoordinates: Coordinate[],
  routeStops: Array<{ name: string; progress: number; coordinate: Coordinate }>,
  speedKph: number,
) {
  if (!routeCoordinates.length) {
    return {
      nearestStop: "Shelter",
      etaMinutes: 0,
      isNearStop: false,
    };
  }

  const cumulative = cumulativeDistance(routeCoordinates);
  const routeProgress = findNearestRouteProgress(
    busPosition,
    routeCoordinates,
    cumulative,
  );
  const routeLength = Math.max(cumulative[cumulative.length - 1] ?? 0, 1);

  let nextStop = routeStops.find(
    (stop) => stop.progress >= routeProgress.progress + 1,
  );
  if (!nextStop) {
    nextStop = routeStops[routeStops.length - 1] ?? {
      name: "Shelter",
      progress: routeLength,
      coordinate: routeCoordinates[routeCoordinates.length - 1] ?? [0, 0],
    };
  }

  let nearestStop = nextStop.name;
  let distanceToStop = Math.max(nextStop.progress - routeProgress.progress, 0);

  if (routeStops.length > 0) {
    let nearestByDistance = routeStops[0];
    let shortest = Number.POSITIVE_INFINITY;
    for (const stop of routeStops) {
      const stopDistance = distanceInMeters(busPosition, stop.coordinate);
      if (stopDistance < shortest) {
        shortest = stopDistance;
        nearestByDistance = stop;
      }
    }

    if (shortest <= 120) {
      nearestStop = nearestByDistance.name;
      distanceToStop = shortest;
    }
  }

  const speedMetersPerSecond = Math.max(speedKph, 1) / 3.6;
  const etaMinutes = Math.max(
    1,
    Math.round(distanceToStop / Math.max(speedMetersPerSecond, 1) / 60),
  );
  const isNearStop = distanceToStop <= 120 || etaMinutes <= 2;

  return {
    nearestStop,
    etaMinutes,
    isNearStop,
    routeProgress: routeProgress.progress,
    distanceToStop,
  };
}

type BusLocationData = {
  lat: number;
  lng: number;
  busId: string;
  speed?: number;
  alt?: number;
  course?: number;
  sat?: number;
  hdop?: number;
  valid?: boolean;
  datetime?: string;
};

export function createMqttBusFeed(input: {
  brokerUrl?: string;
  topic?: string;
  username?: string;
  password?: string;
}): RealtimeFeedAdapter {
  return {
    connect(onMessage, context) {
      const brokerUrl = input.brokerUrl || "mqtt://localhost:1883";
      const topicPattern = input.topic || "/bus/tracking/location";
      const fallbackTopicPattern = topicPattern.includes("localtion")
        ? topicPattern.replace("localtion", "location")
        : topicPattern.replace("location", "localtion");
      const subscriptionTopics = Array.from(
        new Set([`${topicPattern}/#`, `${fallbackTopicPattern}/#`]),
      );
      const cumulative = cumulativeDistance(context.routeCoordinates);
      const stopWaypoints = buildStopWaypoints(context, cumulative);

      let client: ReturnType<typeof mqtt.connect> | null = null;

      const connectToMqtt = () => {
        try {
          const clientOptions: Record<string, unknown> = {
            reconnectPeriod: 1000,
            connectTimeout: 30 * 1000,
            clientId: `buswy-realtime-map-${Math.random().toString(36).substr(2, 9)}`,
          };

          // Add authentication if provided
          if (input.username) {
            clientOptions.username = input.username;
          }
          if (input.password) {
            clientOptions.password = input.password;
          }

          client = mqtt.connect(brokerUrl, clientOptions);

          client.on("connect", () => {
            console.log("MQTT connected, subscribing to:", subscriptionTopics);
            client?.subscribe(subscriptionTopics, (err) => {
              if (err) {
                console.error("MQTT subscribe error:", err);
              } else {
                console.log("MQTT subscribed successfully");
              }
            });
          });

          client.on("message", (topic: string, message: Buffer) => {
            try {
              const rawMessage = message.toString();
              console.log("MQTT message received:", {
                topic,
                payload: rawMessage,
              });

              const payload = JSON.parse(rawMessage) as BusLocationData;
              console.log("MQTT payload parsed:", payload);
              const { busId, lat, lng } = payload;

              if (
                !busId ||
                typeof lat !== "number" ||
                typeof lng !== "number"
              ) {
                console.warn("Invalid MQTT payload:", payload);
                return;
              }

              const position: Coordinate = [lng, lat];
              const now = Date.now();

              const speed = Number(payload.speed ?? 0);
              const speedKph = Number.isFinite(speed) ? speed : 0;
              const telemetry = findNearestStopAndEta(
                position,
                context.routeCoordinates,
                stopWaypoints,
                speedKph,
              );

              onMessage({
                busId,
                position,
                nearestStop: telemetry.nearestStop,
                etaMinutes: telemetry.etaMinutes,
                speedKph,
                speed: Number.isFinite(speed) ? speed : undefined,
                alt: payload.alt,
                course: payload.course,
                sat: payload.sat,
                hdop: payload.hdop,
                valid: payload.valid,
                datetime: payload.datetime,
                passengerCount: 0,
                status: statusFromEta(
                  telemetry.etaMinutes,
                  telemetry.isNearStop,
                ),
                timestamp: now,
              });
            } catch (err) {
              console.error("Error processing MQTT message:", err);
            }
          });

          client.on("error", (err: Error) => {
            console.error("MQTT error:", err);
          });

          client.on("disconnect", () => {
            console.log("MQTT disconnected");
          });
        } catch (err) {
          console.error("Failed to create MQTT connection:", err);
        }
      };

      connectToMqtt();

      return () => {
        if (client) {
          client.end();
        }
      };
    },
  };
}

export function createRealtimeBusFeed(input: {
  brokerUrl?: string;
  topic?: string;
  username?: string;
  password?: string;
}): RealtimeFeedAdapter {
  return createMqttBusFeed({
    brokerUrl: input.brokerUrl,
    topic: input.topic,
    username: input.username,
    password: input.password,
  });
}
