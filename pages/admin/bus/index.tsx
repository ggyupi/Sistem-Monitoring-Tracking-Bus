import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Edit3, Plus, Search, Trash2 } from "lucide-react";

type AdminBusItem = {
  id: string;
  busCode: string;
  plateNumber: string;
  isActive: boolean;
  routeId?: string;
  route?: string;
};

const initialBuses: AdminBusItem[] = [
  {
    id: "b1",
    busCode: "BUS-001",
    plateNumber: "B 1234 SQA",
    route: "Galaxy Express",
    isActive: true,
  },
  {
    id: "b2",
    busCode: "BUS-002",
    plateNumber: "B 5678 TXY",
    route: "Galaxy Express",
    isActive: true,
  },
  {
    id: "b3",
    busCode: "BUS-003",
    plateNumber: "B 9901 ZZ",
    route: "CityLink Metro",
    isActive: false,
  },
  {
    id: "b4",
    busCode: "BUS-004",
    plateNumber: "B 1111 AA",
    isActive: true,
  },
];

const defaultFormValues = {
  busCode: "",
  plateNumber: "",
  route: "",
  isActive: true,
};

export default function AdminBusPage() {
  const [busList, setBusList] = useState<AdminBusItem[]>(initialBuses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<AdminBusItem | null>(null);
  const [formValues, setFormValues] = useState<{
    busCode: string;
    plateNumber: string;
    route: string;
    isActive: boolean;
  }>(defaultFormValues);

  const filteredBuses = useMemo(
    () =>
      busList.filter((busItem) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          busItem.busCode.toLowerCase().includes(query) ||
          busItem.plateNumber.toLowerCase().includes(query) ||
          (busItem.route && busItem.route.toLowerCase().includes(query));

        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "ACTIVE" && busItem.isActive) ||
          (statusFilter === "INACTIVE" && !busItem.isActive);

        return matchesSearch && matchesStatus;
      }),
    [busList, search, statusFilter],
  );

  const activeCount = busList.filter((item) => item.isActive).length;

  const openCreateDialog = () => {
    setEditingBus(null);
    setFormValues(defaultFormValues);
    setIsDialogOpen(true);
  };

  const openEditDialog = (busItem: AdminBusItem) => {
    setEditingBus(busItem);
    setFormValues({
      busCode: busItem.busCode,
      plateNumber: busItem.plateNumber,
      route: busItem.route || "",
      isActive: busItem.isActive,
    });
    setIsDialogOpen(true);
  };

  const resetDialog = () => {
    setEditingBus(null);
    setFormValues(defaultFormValues);
    setIsDialogOpen(false);
  };

  const saveBus = () => {
    if (!formValues.busCode || !formValues.plateNumber) {
      return;
    }

    if (editingBus) {
      setBusList((current) =>
        current.map((item) => (item.id === editingBus.id ? { ...item, ...formValues } : item)),
      );
    } else {
      setBusList((current) => [
        {
          id: `bus-${Date.now()}`,
          ...formValues,
        },
        ...current,
      ]);
    }

    resetDialog();
  };

  const deleteBus = (id: string) => {
    setBusList((current) => current.filter((item) => item.id !== id));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Kelola Data Bus
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Tambah, edit, dan pantau status armada bus Anda
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm">
              <Download className="mr-2" /> Export CSV
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2" /> Tambah Bus Baru
            </Button>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Armada</CardTitle>
            </CardHeader>
            <CardContent className="text-4xl font-semibold text-foreground">{busList.length}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Armada Aktif</CardTitle>
            </CardHeader>
            <CardContent className="text-4xl font-semibold text-foreground">{activeCount}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Status Nonaktif</CardTitle>
            </CardHeader>
            <CardContent className="text-4xl font-semibold text-foreground">{busList.length - activeCount}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Daftar Bus</CardTitle>
              <CardDescription>Cari kode bus, nomor polisi, atau route.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 shadow-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari bus"
                  className="border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border bg-background p-1 text-sm shadow-sm">
                {(["ALL", "ACTIVE", "INACTIVE"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStatusFilter(option)}
                    className={`rounded-full px-3 py-1 transition ${
                      statusFilter === option
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option === "ALL" ? "Semua" : option === "ACTIVE" ? "Aktif" : "Nonaktif"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3 text-left">
              <thead>
                <tr className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Kode Bus</th>
                  <th className="px-4 py-3">Nomor Polisi</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuses.map((busItem) => (
                  <tr
                    key={busItem.id}
                    className="rounded-[18px] border border-border bg-card text-sm shadow-sm"
                  >
                    <td className="px-4 py-4 align-top font-medium text-foreground">{busItem.busCode}</td>
                    <td className="px-4 py-4 align-top text-foreground">{busItem.busCode}</td>
                    <td className="px-4 py-4 align-top text-muted-foreground">{busItem.plateNumber}</td>
                    <td className="px-4 py-4 align-top text-muted-foreground">{busItem.route || "-"}</td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          busItem.isActive
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        {busItem.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(busItem)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteBus(busItem.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredBuses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada bus yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border border-border bg-card">
          <DialogHeader>
            <DialogTitle>{editingBus ? "Edit Bus" : "Tambah Bus Baru"}</DialogTitle>
            <DialogDescription>
              Isi data armada bus untuk memperbarui status operasional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="busCode">Kode Bus</Label>
                <Input
                  id="busCode"
                  value={formValues.busCode}
                  onChange={(event) => setFormValues({ ...formValues, busCode: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plateNumber">Nomor Polisi</Label>
                <Input
                  id="plateNumber"
                  value={formValues.plateNumber}
                  onChange={(event) => setFormValues({ ...formValues, plateNumber: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="route">Route</Label>
                <Input
                  id="route"
                  value={formValues.route}
                  onChange={(event) => setFormValues({ ...formValues, route: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formValues.isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormValues({ ...formValues, isActive: true })}
                  >
                    Aktif
                  </Button>
                  <Button
                    type="button"
                    variant={!formValues.isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormValues({ ...formValues, isActive: false })}
                  >
                    Nonaktif
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={resetDialog}>
              Batal
            </Button>
            <Button type="button" onClick={saveBus}>
              {editingBus ? "Simpan Perubahan" : "Tambah Bus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
