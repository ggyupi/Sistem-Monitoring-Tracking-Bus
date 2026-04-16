import type { GetServerSideProps, NextPage } from "next";

import { UserLayout } from "@/components/user/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionFromRequest } from "@/lib/api-session";

type SettingsPageProps = {
  userName: string;
};

const SettingsPage: NextPage<SettingsPageProps> = ({ userName }) => {
  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
          <h1 className="text-3xl font-bold">Pengaturan</h1>
          <p className="text-muted-foreground">
            Kelola preferensi dan pengaturan aplikasi Anda.
          </p>
        </div>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle>Notifikasi</CardTitle>
            <CardDescription>Atur preferensi notifikasi Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
                <div>
                  <p className="text-sm font-semibold">Notifikasi Bus</p>
                  <p className="text-sm text-muted-foreground">Dapatkan notifikasi ketika bus mendekat</p>
                </div>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
                <div>
                  <p className="text-sm font-semibold">Update Sistem</p>
                  <p className="text-sm text-muted-foreground">Dapatkan informasi update aplikasi</p>
                </div>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle>Privasi</CardTitle>
            <CardDescription>Kelola pengaturan privasi Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
                <div>
                  <p className="text-sm font-semibold">Lokasi</p>
                  <p className="text-sm text-muted-foreground">Izinkan akses lokasi untuk fitur tracking</p>
                </div>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle>Tampilan</CardTitle>
            <CardDescription>Atur tampilan aplikasi.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
                <div>
                  <p className="text-sm font-semibold">Tema Gelap</p>
                  <p className="text-sm text-muted-foreground">Gunakan tema gelap untuk aplikasi</p>
                </div>
                <input type="checkbox" className="rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
};

export const getServerSideProps: GetServerSideProps<SettingsPageProps> = async (context) => {
  const session = await getSessionFromRequest(context.req);

  if (!session?.user) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  const userName = session.user.name || "Pengguna";

  return {
    props: {
      userName,
    },
  };
};

export default SettingsPage;