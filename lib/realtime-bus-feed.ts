export type Coordinate = [number, number];

export type BusTelemetryStatus = "ON_SCHEDULE" | "NEAR_ARRIVAL" | "NORMAL";

export type BusTelemetry = {
  busId: string;
  position: Coordinate;
  nearestStop: string;
  etaMinutes: number;
  speedKph: number;
  passengerCount: number;
  status: BusTelemetryStatus;
  timestamp: number;
};

export type FeedContext = {
  routeCoordinates: Coordinate[];
  stopNames: string[];
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

type FeedFactoryInput = {
  mode: "mock" | "mqtt";
  mqttBrokerUrl?: string;
  mqttTopic?: string;
};

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

function statusFromEta(etaMinutes: number): BusTelemetryStatus {
  if (etaMinutes <= 2) {
    return "NEAR_ARRIVAL";
  }

  if (etaMinutes <= 5) {
    return "ON_SCHEDULE";
  }

  return "NORMAL";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createMockBusFeed(): RealtimeFeedAdapter {
  return {
    connect(onMessage, context) {
      const coords = context.routeCoordinates;
      const stopNames = context.stopNames;

      if (!coords.length) {
        return () => undefined;
      }

      const cumulative = cumulativeDistance(coords);
      const routeLength = Math.max(cumulative[cumulative.length - 1] ?? 0, 1);
      const busCount = Math.max(context.busCount ?? 6, 1);
      const minSpeedKph = 40;
      const maxSpeedKph = 100;
      const stopCount = Math.max(stopNames.length, 1);
      const stopLength = routeLength / stopCount;
      const intervalMs = 120;
      const dwellDurationMs = 60_000;
      const tickSeconds = intervalMs / 1000;

      const buses = Array.from({ length: busCount }, (_, index) => {
        const baseSpeedKph = clamp(
          52 + index * 5,
          minSpeedKph + 2,
          maxSpeedKph - 8,
        );

        return {
          busId: `Bus ${String.fromCharCode(65 + (index % 4))}${12 + index}`,
          distanceProgress: (routeLength * index) / busCount,
          baseSpeedKph,
          passengerSeed: 10 + index * 3,
          phase: (Math.PI / 3) * index,
          dwellRemainingMs: 0,
          currentStopIndex:
            Math.floor((routeLength * index) / busCount / stopLength) %
            stopCount,
        };
      });

      let elapsedMs = 0;

      const intervalId = window.setInterval(() => {
        elapsedMs += intervalMs;

        buses.forEach((bus, index) => {
          let speedKph = 0;

          if (bus.dwellRemainingMs > 0) {
            bus.dwellRemainingMs = Math.max(
              0,
              bus.dwellRemainingMs - intervalMs,
            );
            bus.distanceProgress =
              (bus.currentStopIndex * stopLength) % routeLength;
          } else {
            const speedOscillation =
              1 + Math.sin(elapsedMs / 3200 + bus.phase) * 0.12;
            speedKph = clamp(
              bus.baseSpeedKph * speedOscillation,
              minSpeedKph,
              maxSpeedKph,
            );
            const speedMetersPerSecond = speedKph / 3.6;

            const currentStopIndex =
              Math.floor(bus.distanceProgress / stopLength) % stopCount;
            const nextProgress =
              (bus.distanceProgress + speedMetersPerSecond * tickSeconds) %
              routeLength;
            const nextStopIndex =
              Math.floor(nextProgress / stopLength) % stopCount;

            if (nextStopIndex !== currentStopIndex) {
              bus.currentStopIndex = nextStopIndex;
              bus.distanceProgress = (nextStopIndex * stopLength) % routeLength;
              bus.dwellRemainingMs = dwellDurationMs;
              speedKph = 0;
            } else {
              bus.currentStopIndex = currentStopIndex;
              bus.distanceProgress = nextProgress;
            }
          }

          const speedOscillation =
            1 + Math.sin(elapsedMs / 7000 + bus.phase) * 0.08;
          const speedMetersPerSecond = speedKph / 3.6;

          const position = pointAtDistance(
            coords,
            cumulative,
            bus.distanceProgress,
          );

          const progress = bus.distanceProgress / routeLength;
          const distanceInSegment = bus.distanceProgress % stopLength;
          const distanceToNextStop = Math.max(
            stopLength - distanceInSegment,
            10,
          );
          const etaMinutes =
            bus.dwellRemainingMs > 0
              ? 1
              : Math.max(
                  1,
                  Math.min(
                    12,
                    Math.round(
                      distanceToNextStop /
                        Math.max(speedMetersPerSecond, 1) /
                        60,
                    ),
                  ),
                );
          const stopIndex =
            bus.dwellRemainingMs > 0
              ? bus.currentStopIndex
              : Math.floor(progress * stopCount) % stopCount;

          const passengerWave =
            bus.passengerSeed +
            Math.sin(elapsedMs / 7000 + bus.phase) * 9 * speedOscillation +
            index;
          const passengerCount = Math.max(
            3,
            Math.min(58, Math.round(passengerWave)),
          );

          onMessage({
            busId: bus.busId,
            position,
            nearestStop: stopNames[stopIndex] ?? "Shelter",
            etaMinutes,
            speedKph: Math.round((speedKph + Number.EPSILON) * 10) / 10,
            passengerCount,
            status: statusFromEta(etaMinutes),
            timestamp: Date.now(),
          });
        });
      }, 120);

      return () => {
        window.clearInterval(intervalId);
      };
    },
  };
}

export function createMqttBusFeed(input: {
  brokerUrl?: string;
  topic?: string;
}): RealtimeFeedAdapter {
  return {
    connect(onMessage, context) {
      console.warn(
        "MQTT adapter belum dihubungkan. Menggunakan mock feed sebagai fallback.",
        {
          brokerUrl: input.brokerUrl,
          topic: input.topic,
        },
      );

      return createMockBusFeed().connect(onMessage, context);
    },
  };
}

export function createRealtimeBusFeed(
  input: FeedFactoryInput,
): RealtimeFeedAdapter {
  if (input.mode === "mqtt") {
    return createMqttBusFeed({
      brokerUrl: input.mqttBrokerUrl,
      topic: input.mqttTopic,
    });
  }

  return createMockBusFeed();
}
