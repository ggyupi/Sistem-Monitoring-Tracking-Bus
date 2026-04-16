import Link from "next/link";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RfidCardDetailPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detail Kartu RFID</CardTitle>
            <CardDescription>
              Halaman detail kartu RFID sedang dalam proses pengembangan. Kembali ke halaman utama kartu RFID untuk melihat daftar kartu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Jika Anda ingin membuat atau mengelola kartu RFID, gunakan halaman utama pengelolaan kartu.
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
