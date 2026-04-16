import Link from "next/link";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RfidCardCreatePage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Halaman Tambah Kartu RFID</CardTitle>
            <CardDescription>
              Gunakan halaman utama kartu RFID untuk menambahkan atau mengelola data kartu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Halaman ini belum diimplementasikan. Silakan kembali ke halaman utama pengelolaan kartu RFID.
            </p>
            <div className="mt-4">
              <Link href="/admin/cards">
                <Button>Kelola Kartu RFID</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
