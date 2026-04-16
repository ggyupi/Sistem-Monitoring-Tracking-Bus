import Link from "next/link";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpRight,
  BatteryCharging,
  Bus,
  BusFront,
  CreditCard,
  MapPin,
  ReceiptText,
  Route,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";

const menuItems = [
  {
    label: "Kelola data bus",
    description: "Tambahkan dan kelola armada bus Anda.",
    href: "/admin/buses",
    icon: BusFront,
  },
  {
    label: "Kelola route dan halte",
    description: "Atur jalur dan halte untuk rute perjalanan.",
    href: "/admin/routes",
    icon: Route,
  },
  {
    label: "Kelola kartu RFID",
    description: "Kelola data kartu RFID untuk tap in/out.",
    href: "/admin/cards",
    icon: CreditCard,
  },
  {
    label: "Kelola transaksi tap in/out",
    description: "Pantau riwayat transaksi dan status tap.",
    href: "/admin/transactions",
    icon: ReceiptText,
  },
  {
    label: "Kelola user dan role",
    description: "Atur akses pengguna dan peran sistem.",
    href: "/admin/settings",
    icon: Users,
  },
];

const metrics = [
  {
    label: "Total Buses",
    value: "124",
    description: "+2.4% vs last week",
    icon: Bus,
  },
  {
    label: "Active Buses",
    value: "118",
    description: "Realtime telemetry active",
    icon: Wifi,
  },
  {
    label: "Total RFID Cards",
    value: "1,284",
    description: "Ready for tap-in",
    icon: CreditCard,
  },
  {
    label: "System Uptime",
    value: "99.9%",
    description: "Optimal operation",
    icon: BatteryCharging,
    accent: true,
  },
];

const activity = [
  {
    title: "Bus #422 Updated GPS",
    subtitle: "Arrived at Central Station North",
    time: "2 mins ago",
    color: "bg-sky-500",
  },
  {
    title: "RFID Tap: Card 0x8823",
    subtitle: "Entry recorded on Route B-12",
    time: "5 mins ago",
    color: "bg-emerald-500",
  },
  {
    title: "Bus #108 Updated GPS",
    subtitle: "Departed Downtown Terminal",
    time: "12 mins ago",
    color: "bg-slate-500",
  },
  {
    title: "Sensor Offline: Bus #003",
    subtitle: "Secondary RFID reader timeout",
    time: "24 mins ago",
    color: "bg-amber-500",
  },
  {
    title: "RFID Tap: Card 0x1192",
    subtitle: "Exit recorded at Pier 39",
    time: "31 mins ago",
    color: "bg-sky-500",
  },
];

const routes = [
  {
    label: "A1",
    title: "North Loop",
    status: "On Time",
    detail: "12 Buses",
    color: "bg-slate-100 text-slate-900",
  },
  {
    label: "B12",
    title: "Harbor Express",
    status: "4m Delay",
    detail: "8 Buses",
    color: "bg-emerald-50 text-emerald-900",
  },
  {
    label: "C9",
    title: "Crosstown",
    status: "On Time",
    detail: "15 Buses",
    color: "bg-orange-50 text-orange-950",
  },
];

export default function AdminPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
              BusControl Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              System Overview
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Real-time telemetry and operation status across your fleet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="secondary">
              Refresh data
            </Button>
            <Button size="sm">Add new sensor</Button>
          </div>
        </section>

        <section className="space-y-6">

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg">
                  <Link href={item.href} className="block h-full">
                    <CardHeader className="gap-4 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{item.label}</CardTitle>
                        <CardDescription className="mt-2 text-sm text-muted-foreground">
                          {item.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Link>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className={
                  metric.accent
                    ? "rounded-3xl border border-transparent bg-primary text-primary-foreground p-6 shadow-lg"
                    : "rounded-3xl border border-border bg-card p-6 shadow-sm"
                }
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-4 text-3xl font-semibold tracking-tight">
                      {metric.value}
                    </p>
                  </div>
                  <div
                    className={
                      metric.accent
                        ? "rounded-2xl bg-white/15 p-3 text-primary-foreground"
                        : "rounded-2xl bg-slate-100 p-3 text-slate-900"
                    }
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <p className="mt-5 text-sm text-muted-foreground">{metric.description}</p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Fleet map
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">Metropolitan Hub</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Live fleet positioning active across the central area.
                </p>
              </div>
              <Button variant="outline" size="sm">
                View full map
              </Button>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-border bg-slate-100 px-5 py-5 text-center text-slate-500">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-700">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="h-[360px] rounded-[1.5rem] bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] p-4 shadow-inner">
                <div className="relative h-full rounded-[1.5rem] border border-slate-200 bg-[url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cpath d=\'M50 0h50v50M0 50h50v50\' fill=\'none\' stroke=%27%23cbd5e1%27 stroke-width=1/%3E%3C/svg%3E')] bg-[length:100px_100px]">
                  <div className="absolute left-8 top-16 flex h-12 w-12 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-[0_16px_36px_-24px_rgba(30,64,175,0.9)]">
                    <Bus className="h-5 w-5" />
                  </div>
                  <div className="absolute right-14 top-40 flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-[0_16px_36px_-24px_rgba(16,185,129,0.9)]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="absolute left-24 bottom-24 flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-[0_16px_36px_-24px_rgba(15,23,42,0.85)]">
                    <Wifi className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Recent Activity
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">Live events</h2>
                </div>
                <Button size="sm" variant="outline">
                  View all
                </Button>
              </div>
              <div className="mt-6 space-y-4">
                {activity.map((item) => (
                  <div key={item.title} className="flex items-start gap-4 rounded-3xl border border-border bg-background p-4">
                    <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-2xl ${item.color} text-white`}>
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <span className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Route Analysis
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">Active routes</h2>
                </div>
                <Button size="sm" variant="secondary">
                  Analyze
                </Button>
              </div>
              <div className="mt-6 grid gap-4">
                {routes.map((route) => (
                  <div key={route.label} className={`rounded-3xl border border-border p-4 ${route.color}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{route.title}</p>
                        <p className="text-xs text-muted-foreground">{route.detail}</p>
                      </div>
                      <div className="rounded-2xl border border-current px-3 py-1 text-xs font-semibold uppercase">
                        {route.label}
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">{route.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
// import AdminLayout from "@/components/layout/AdminLayout";

// export default function Dashboard() {
//   return (
//     <AdminLayout>
//       <div className="grid grid-cols-3 gap-4">
//         <div className="bg-card p-4 rounded-xl border border-border">
//           <p className="text-muted-foreground">Total Bus</p>
//           <h2 className="text-2xl font-bold">10</h2>
//         </div>
//         <div className="bg-card p-4 rounded-xl border border-border">
//           <p className="text-muted-foreground">RFID</p>
//           <h2 className="text-2xl font-bold">20</h2>
//         </div>
//       </div>
//     </AdminLayout>
//   );
// }