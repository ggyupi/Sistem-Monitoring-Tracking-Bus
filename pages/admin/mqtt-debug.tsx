import { AdminLayout } from "@/components/admin/layout";
import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import { useEffect, useMemo, useRef, useState } from "react";

type MessageItem = {
  id: number;
  topic: string;
  payload: string;
  timestamp: string;
};

const DEFAULT_BROKER_URL =
  process.env.NEXT_PUBLIC_MQTT_BROKER_URL ||
  "wss://broker.hivemq.com:8884/mqtt";
const DEFAULT_TOPIC = process.env.NEXT_PUBLIC_MQTT_TOPIC || "buswy/debug/#";
const DEFAULT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USERNAME || "";
const DEFAULT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASSWORD || "";

export default function MqttDebugPage() {
  const clientRef = useRef<MqttClient | null>(null);
  const [brokerUrl, setBrokerUrl] = useState(DEFAULT_BROKER_URL);
  const [topic, setTopic] = useState(DEFAULT_TOPIC);
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [clientId, setClientId] = useState(
    () => `buswy-debug-${Math.random().toString(16).slice(2, 10)}`,
  );
  const [status, setStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const messageCount = useMemo(() => messages.length, [messages]);

  const decodePayload = (payload: Buffer | Uint8Array) => {
    if (typeof (payload as Buffer).toString === "function") {
      return (payload as Buffer).toString();
    }

    return new TextDecoder().decode(payload);
  };

  const disconnectClient = () => {
    if (!clientRef.current) return;

    clientRef.current.end(true);
    clientRef.current = null;
    setStatus("disconnected");
  };

  const handleConnect = () => {
    if (!brokerUrl.trim() || !topic.trim()) {
      setErrorMessage("Broker URL dan topic wajib diisi.");
      return;
    }

    disconnectClient();
    setStatus("connecting");
    setErrorMessage("");

    const options: IClientOptions = {
      clean: true,
      reconnectPeriod: 2000,
      clientId,
      username: username.trim() || undefined,
      password: password || undefined,
    };

    const client = mqtt.connect(brokerUrl, options);
    clientRef.current = client;

    client.on("connect", () => {
      setStatus("connected");

      client.subscribe(topic, (error) => {
        if (error) {
          setErrorMessage(`Gagal subscribe topic: ${error.message}`);
          setStatus("error");
        }
      });
    });

    client.on("message", (msgTopic, payload) => {
      const body = decodePayload(payload);
      const now = new Date().toISOString();

      setMessages((prev) => {
        const next: MessageItem[] = [
          {
            id: Date.now() + Math.random(),
            topic: msgTopic,
            payload: body,
            timestamp: now,
          },
          ...prev,
        ];

        return next.slice(0, 200);
      });
    });

    client.on("error", (error) => {
      setStatus("error");
      setErrorMessage(error.message || "Terjadi error pada koneksi MQTT.");
    });

    client.on("close", () => {
      setStatus("disconnected");
    });
  };

  useEffect(() => {
    return () => {
      disconnectClient();
    };
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            MQTT Debug Client
          </h1>
          <p className="text-sm text-gray-500">
            Halaman sederhana untuk melihat data masuk dari HiveMQ.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Broker URL (WebSocket)
              </label>
              <input
                value={brokerUrl}
                onChange={(event) => setBrokerUrl(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="wss://broker.hivemq.com:8884/mqtt"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Topic
              </label>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="buswy/debug/#"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Username (Opsional)
              </label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="username broker"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Password (Opsional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="password broker"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Client ID
              </label>
              <input
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="buswy-debug-client"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleConnect}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Connect
            </button>
            <button
              type="button"
              onClick={disconnectClient}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Disconnect
            </button>
            <button
              type="button"
              onClick={() => setMessages([])}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Clear Log
            </button>
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <div>Status: {status}</div>
            <div>Topic Aktif: {topic || "-"}</div>
            <div>Broker: {brokerUrl || "-"}</div>
            <div>Username: {username || "(kosong)"}</div>
            <div>Jumlah Pesan: {messageCount}</div>
            {errorMessage ? (
              <div className="text-red-600">Error: {errorMessage}</div>
            ) : null}
            <p className="mt-1 text-xs text-gray-500">
              Jika muncul &quot;Not authorized&quot;, cek kredensial dan ACL
              topic di broker HiveMQ Anda.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Incoming Messages
          </h2>
          <div className="max-h-115 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada data masuk.</p>
            ) : (
              <ul className="space-y-2">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className="rounded-md border border-gray-200 bg-white p-2 text-xs"
                  >
                    <div className="font-semibold text-gray-800">
                      {message.topic}
                    </div>
                    <div className="text-gray-500">{message.timestamp}</div>
                    <pre className="mt-1 whitespace-pre-wrap wrap-break-word text-gray-700">
                      {message.payload}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
