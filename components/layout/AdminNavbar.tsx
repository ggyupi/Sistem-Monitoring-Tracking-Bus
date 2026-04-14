export function AdminNavbar() {
  return (
    <div className="w-full p-4 border-b border-border bg-background flex justify-between">
      <h2 className="font-bold">Admin Dashboard</h2>
      <input className="bg-input border border-border px-3 py-1 rounded" placeholder="Search..." />
    </div>
  );
}