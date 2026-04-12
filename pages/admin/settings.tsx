import { AdminLayout } from "@/components/admin/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminOverview } from "@/lib/hooks/use-admin-overview";

export default function AdminSettingsPage() {
  const overviewQuery = useAdminOverview();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Admin Settings & Overview</h1>
          <p className="text-muted-foreground">
            Ringkasan data utama untuk monitoring kesiapan operasional aplikasi.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Statistik Sistem</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat ringkasan sistem...</p>
            ) : null}

            {overviewQuery.isError ? (
              <p className="text-sm text-destructive">
                {overviewQuery.error instanceof Error
                  ? overviewQuery.error.message
                  : "Gagal memuat ringkasan sistem"}
              </p>
            ) : null}

            {!overviewQuery.isLoading && !overviewQuery.isError && overviewQuery.data ? (
              <div className="grid gap-3 md:grid-cols-3">
                <MetricCard label="Users" value={overviewQuery.data.users} />
                <MetricCard label="Buses" value={overviewQuery.data.buses} />
                <MetricCard label="Routes" value={overviewQuery.data.routes} />
                <MetricCard label="Stations" value={overviewQuery.data.stations} />
                <MetricCard label="Cards" value={overviewQuery.data.cards} />
                <MetricCard
                  label="Transactions"
                  value={overviewQuery.data.transactions}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-input p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
