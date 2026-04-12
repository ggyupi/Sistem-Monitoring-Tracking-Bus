import { AdminLayout } from "@/components/admin/layout";
import Link from "next/link";

export default function AdminPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the admin dashboard. Here you can manage your application.
        </p>
        <div className="grid gap-1 text-sm">
          <Link
            href="/admin/buses"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Kelola data bus
          </Link>
          <Link
            href="/admin/routes"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Kelola rute dan halte
          </Link>
          <Link
            href="/admin/cards"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Kelola kartu RFID
          </Link>
          <Link
            href="/admin/transactions"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Kelola transaksi tap in/out
          </Link>
          <Link
            href="/admin/users"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Kelola user dan role
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
