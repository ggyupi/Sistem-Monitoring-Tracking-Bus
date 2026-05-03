# MQTT Real-Time Bus Tracking Setup

## Overview

Buswy Real-Time Map menggunakan MQTT protocol untuk menerima data posisi bus real-time dari GPS trackers yang terpasang pada setiap bus.

## Data Format

Bus tracker mengirim data dengan format JSON ke topic MQTT:

```
Topic: /bus/tracking/location/{busId}
Payload: {
  "busId": "cmogol00q0007bcvj5aa3lskf",
  "lat": -8.143626333,
  "lng": 111.7891982
}
```

## Setup Development

### 1. Choose MQTT Broker

#### Option A: HiveMQ Cloud (Managed - Recommended for Production)

1. Sign up at [hivemq.com](https://www.hivemq.com/)
2. Create cluster, get WebSocket endpoint (format: `wss://xxxx.hivemq.cloud:8884/mqtt`)
3. Create user credentials
4. Set environment variables:

```
NEXT_PUBLIC_MQTT_BROKER_URL=wss://16e6058923074678adb7fa8e5628865e.s1.eu.hivemq.cloud:8884/mqtt
NEXT_PUBLIC_MQTT_USERNAME=your-username
NEXT_PUBLIC_MQTT_PASSWORD=your-password
NEXT_PUBLIC_MQTT_TOPIC=/bus/tracking/location
```

#### Option B: Mosquitto (Self-Hosted)

**Windows:**

- Download from [mosquitto.org](https://mosquitto.org/download/)
- Install and run Mosquitto

**Linux/Mac:**

```bash
brew install mosquitto
mosquitto
```

#### Option B: Using Docker

```bash
docker run -it -p 1883:1883 -p 8080:8080 eclipse-mosquitto:latest
```

Docker image akan expose:

- Port 1883: MQTT protocol
- Port 8080: WebSocket (untuk browser)

### 2. Configure WebSocket Bridge

Mosquitto default tidak support WebSocket untuk browser client. Untuk development, gunakan Docker image yang sudah support WebSocket, atau configure manual:

**mosquitto.conf:**

```
listener 1883
listener 8080
protocol websockets
```

### 3. Environment Variables

Set di `.env.local`:

```
NEXT_PUBLIC_MQTT_BROKER_URL=wss://your-cluster.hivemq.cloud:8884/mqtt
NEXT_PUBLIC_MQTT_TOPIC=/bus/tracking/location
NEXT_PUBLIC_MQTT_USERNAME=your-username
NEXT_PUBLIC_MQTT_PASSWORD=your-password
NEXT_PUBLIC_BUS_FEED_MODE=mqtt
```

**For local Mosquitto:**

```
NEXT_PUBLIC_MQTT_BROKER_URL=ws://localhost:8080
NEXT_PUBLIC_MQTT_TOPIC=/bus/tracking/location
NEXT_PUBLIC_BUS_FEED_MODE=mqtt
```

**Notes:**

- Use `wss://` (Secure WebSocket) for production/cloud
- Use `ws://` (WebSocket) for local development
- Username/password are optional (required for HiveMQ Cloud)

### 4. Testing dengan MQTT Client

**Option A: Using MQTT Explorer (GUI)**

- Download dari [mqtt-explorer.com](https://mqtt-explorer.com/)
- Connect ke `localhost:1883`
- Publish test message ke `/bus/tracking/location/test-bus-1`

**Option B: Using mosquitto_pub (CLI)**

```bash
mosquitto_pub -h localhost -p 1883 -t "/bus/tracking/location/cmogol00q0007bcvj5aa3lskf" -m '{"busId":"cmogol00q0007bcvj5aa3lskf","lat":-8.143626333,"lng":111.7891982}'
```

**Option C: Using Node.js**

```javascript
const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  client.publish(
    "/bus/tracking/location/bus-001",
    JSON.stringify({
      busId: "bus-001",
      lat: -8.143626333,
      lng: 111.7891982,
    }),
  );
});
```

## Production Setup

### 1. MQTT Broker Deployment

Options:

- **HiveMQ Cloud**: Managed MQTT service (easiest, recommended)
- **EMQ X**: Enterprise-grade MQTT broker
- **Self-hosted Mosquitto**: On dedicated server

### 2. Security Configuration

#### For HiveMQ Cloud:

- Set strong username/password
- Enable JWT authentication (optional, advanced)
- Configure ACL rules to restrict topic access
- Use WSS (WebSocket Secure) protocol

#### For Self-Hosted:

- Enable authentication (username/password or certificates)
- Use TLS/SSL encryption (port 8883/8884)
- Configure ACL for each bus tracker
- Firewall MQTT ports (default 1883, 8883 for TLS)

### 3. Environment Variables for Production

**HiveMQ Cloud Example:**

```
NEXT_PUBLIC_MQTT_BROKER_URL=wss://16e6058923074678adb7fa8e5628865e.s1.eu.hivemq.cloud:8884/mqtt
NEXT_PUBLIC_MQTT_USERNAME=buswy_tracker
NEXT_PUBLIC_MQTT_PASSWORD=your-secure-password
NEXT_PUBLIC_MQTT_TOPIC=/bus/tracking/location
NEXT_PUBLIC_BUS_FEED_MODE=mqtt
```

**Self-Hosted Example:**

```
NEXT_PUBLIC_MQTT_BROKER_URL=wss://your-domain.com:8883/mqtt
NEXT_PUBLIC_MQTT_USERNAME=tracker_user
NEXT_PUBLIC_MQTT_PASSWORD=tracker_password
NEXT_PUBLIC_MQTT_TOPIC=/bus/tracking/location
NEXT_PUBLIC_BUS_FEED_MODE=mqtt
```

Use `wss://` (Secure WebSocket) for all production deployments.

## Data Processing

Aplikasi client-side melakukan:

1. **Speed Calculation**: Dari delta posisi dan timestamp
2. **Nearest Stop**: Cari stop terdekat di rute yang sedang aktif
3. **ETA Calculation**: Berdasarkan kecepatan dan jarak ke stop berikutnya
4. **Passenger Count**: Default dari database atau dari sensor (future)

## Fallback

Jika MQTT connection gagal:

- Aplikasi akan otomatis fallback ke mock feed (dummy data)
- Development tetap berjalan meski MQTT tidak tersedia

## Troubleshooting

### Connection Timeout

- Pastikan broker running di port yang benar
- Check firewall rules
- Verify environment variables

### No Data Received

- Verify topic pattern: `/bus/tracking/location/#`
- Check MQTT client logs
- Publish test message manually

### Passenger Count Always Default

- Current implementation menggunakan default value
- Untuk sensor real passenger count, integrate dengan sistem PIS (Passenger Information System)

## References

- [MQTT Protocol Spec](https://mqtt.org/)
- [Mosquitto Documentation](https://mosquitto.org/documentation/)
- [mqtt.js Library](https://github.com/mqttjs/MQTT.js)
