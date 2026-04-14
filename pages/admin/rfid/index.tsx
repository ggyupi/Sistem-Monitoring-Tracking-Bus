import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";

interface RfidItem {
  id: number;
  code: string;
}

export default function RfidPage() {
  const [rfid, setRfid] = useState<RfidItem[]>([]);
  const [code, setCode] = useState("");

  const addRfid = () => {
    setRfid([...rfid, { id: Date.now(), code }]);
    setCode("");
  };

  const deleteRfid = (id: number) => {
    setRfid(rfid.filter((r) => r.id !== id));
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="bg-card p-4 border border-border rounded-xl">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="bg-input border border-border px-3 py-2 rounded mr-2"
            placeholder="RFID Code"
          />
          <button onClick={addRfid} className="bg-primary text-primary-foreground px-4 py-2 rounded">
            Add RFID
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          {rfid.map((r) => (
            <div key={r.id} className="flex justify-between border-b border-border py-2">
              <span>{r.code}</span>
              <button onClick={() => deleteRfid(r.id)} className="text-destructive">Delete</button>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}