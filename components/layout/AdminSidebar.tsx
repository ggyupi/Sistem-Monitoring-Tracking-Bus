import Link from 'next/link';

export function AdminSidebar() {
  return (
    <aside className="w-64 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4">
      <h1 className="text-xl font-bold mb-6">BusControl</h1>
      <nav className="space-y-2">
        <Link href="/admin" className="block p-2 rounded bg-sidebar-accent">Dashboard</Link>
        <Link href="/admin/buses" className="block p-2 rounded hover:bg-sidebar-accent">Bus</Link>
        <Link href="/admin/rfid" className="block p-2 rounded hover:bg-sidebar-accent">RFID</Link>
      </nav>
    </aside>
  );
}