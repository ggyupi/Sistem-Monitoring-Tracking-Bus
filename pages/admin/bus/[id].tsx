import Link from "next/link";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminBusDetailPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detail Bus</CardTitle>
            <CardDescription>
              Halaman detail bus belum diimplementasikan secara mandiri. Silakan gunakan halaman utama bus untuk melihat dan mengedit data bus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Jika Anda ingin melihat detail bus, buka kembali daftar bus dan pilih Edit pada baris yang sesuai.
            </p>
            <div className="mt-4">
              <Link href="/admin/buses">
                <Button>Kembali ke Daftar Bus</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
