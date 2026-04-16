import Link from "next/link";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminBusCreatePage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tambah Bus</CardTitle>
            <CardDescription>
              Halaman ini belum diimplementasikan secara mandiri. Gunakan halaman utama pengelolaan bus untuk membuat data bus baru.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Untuk menambah bus, silakan kembali ke daftar bus dan gunakan tombol Tambah Bus Baru.
            </p>
            <div className="mt-4">
              <Link href="/admin/buses">
                <Button>Kelola Bus</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
