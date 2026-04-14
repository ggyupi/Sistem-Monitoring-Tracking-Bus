import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";

interface Bus {
  id: number;
  name: string;
}

export default function BusPage() {
  const [bus, setBus] = useState<Bus[]>([]);
  const [name, setName] = useState("");

  const addBus = () => {
    setBus([...bus, { id: Date.now(), name }]);
    setName("");
  };

  const deleteBus = (id: number) => {
    setBus(bus.filter((b) => b.id !== id));
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="bg-card p-4 border border-border rounded-xl">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-input border border-border px-3 py-2 rounded mr-2"
            placeholder="Bus name"
          />
          <button onClick={addBus} className="bg-primary text-primary-foreground px-4 py-2 rounded">
            Add Bus
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          {bus.map((b) => (
            <div key={b.id} className="flex justify-between border-b border-border py-2">
              <span>{b.name}</span>
              <button onClick={() => deleteBus(b.id)} className="text-destructive">Delete</button>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}