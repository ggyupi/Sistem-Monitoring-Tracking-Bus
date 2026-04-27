import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  BusItem,
  useAdminBuses,
  useCreateBusMutation,
  useDeleteBusMutation,
  useUpdateBusMutation,
} from "@/lib/hooks/use-admin-buses";
import { Download, Edit3, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";

type BusFormValues = {
  busCode: string;
  plateNumber: string;
  routeId: string | null;
  isActive: boolean;
  maxPassengers: string;
};

const defaultFormValues: BusFormValues = {
  busCode: "",
  plateNumber: "",
  routeId: null,
  isActive: true,
  maxPassengers: "50",
};

export default function AdminBusPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<BusItem | null>(null);
  const [formValues, setFormValues] =
    useState<BusFormValues>(defaultFormValues);

  const busesQuery = useAdminBuses(search);
  const createBusMutation = useCreateBusMutation();
  const updateBusMutation = useUpdateBusMutation();
  const deleteBusMutation = useDeleteBusMutation();

  const busList = useMemo(
    () => busesQuery.data?.buses ?? [],
    [busesQuery.data],
  );
  const routeOptions = useMemo(
    () => busesQuery.data?.routes ?? [],
    [busesQuery.data],
  );

  const filteredBuses = useMemo(
    () =>
      busList.filter((busItem) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          busItem.busCode.toLowerCase().includes(query) ||
          busItem.plateNumber.toLowerCase().includes(query) ||
          (busItem.route?.routeName.toLowerCase().includes(query) ?? false);

        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "ACTIVE" && busItem.isActive) ||
          (statusFilter === "INACTIVE" && !busItem.isActive);

        return matchesSearch && matchesStatus;
      }),
    [busList, search, statusFilter],
  );

  const activeCount = busList.filter((item) => item.isActive).length;
  const totalPassengers = busList.reduce(
    (sum, busItem) => sum + (busItem.passengerCount ?? 0),
    0,
  );
  const isSaving = createBusMutation.isPending || updateBusMutation.isPending;

  const openCreateDialog = () => {
    setEditingBus(null);
    setFormValues(defaultFormValues);
    setIsDialogOpen(true);
  };

  const openEditDialog = (busItem: BusItem) => {
    setEditingBus(busItem);
    setFormValues({
      busCode: busItem.busCode,
      plateNumber: busItem.plateNumber,
      routeId: busItem.route?.id ?? null,
      isActive: busItem.isActive,
      maxPassengers: String(busItem.maxPassengers ?? 50),
    });
    setIsDialogOpen(true);
  };

  const resetDialog = () => {
    setEditingBus(null);
    setFormValues(defaultFormValues);
    setIsDialogOpen(false);
  };

  const saveBus = async () => {
    if (!formValues.busCode || !formValues.plateNumber) {
      toast.error("Kode bus dan nomor polisi wajib diisi");
      return;
    }

    const parsedMaxPassengers = Number(formValues.maxPassengers);

    if (!Number.isInteger(parsedMaxPassengers) || parsedMaxPassengers < 1) {
      toast.error("Kapasitas maksimal harus angka bulat minimal 1");
      return;
    }

    try {
      if (editingBus) {
        await updateBusMutation.mutateAsync({
          id: editingBus.id,
          payload: {
            busCode: formValues.busCode,
            plateNumber: formValues.plateNumber,
            isActive: formValues.isActive,
            maxPassengers: parsedMaxPassengers,
            routeId: formValues.routeId,
          },
        });
        toast.success("Bus berhasil diperbarui");
      } else {
        await createBusMutation.mutateAsync({
          busCode: formValues.busCode,
          plateNumber: formValues.plateNumber,
          isActive: formValues.isActive,
          maxPassengers: parsedMaxPassengers,
          routeId: formValues.routeId,
        });
        toast.success("Bus berhasil ditambahkan");
      }
      resetDialog();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan bus",
      );
    }
  };

  const deleteBus = async (id: string) => {
    try {
      await deleteBusMutation.mutateAsync(id);
      toast.success("Bus berhasil dihapus");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus bus",
      );
    }
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Armada</CardTitle>
            </CardHeader>
            <CardContent className="text-4xl font-semibold text-foreground">
              {busList.length}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Armada Aktif</CardTitle>
            </CardHeader>
            <CardContent className="text-4xl font-semibold text-foreground">
              {activeCount}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Status Nonaktif</CardTitle>
            </CardHeader>
            <CardContent className="text-4xl font-semibold text-foreground">
              {busList.length - activeCount}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Penumpang</CardTitle>
            </CardHeader>
            <CardContent className="text-4xl font-semibold text-foreground">
              {totalPassengers}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Daftar Bus</CardTitle>
              <CardDescription>
                Cari kode bus, nomor polisi, atau route.
              </CardDescription>
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
                    {option === "ALL"
                      ? "Semua"
                      : option === "ACTIVE"
                        ? "Aktif"
                        : "Nonaktif"}
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
                  <th className="px-4 py-3">Penumpang</th>
                  <th className="px-4 py-3">Kapasitas Maks</th>
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
                    <td className="px-4 py-4 align-top font-medium text-foreground">
                      {busItem.id}
                    </td>
                    <td className="px-4 py-4 align-top text-foreground">
                      {busItem.busCode}
                    </td>
                    <td className="px-4 py-4 align-top text-muted-foreground">
                      {busItem.plateNumber}
                    </td>
                    <td className="px-4 py-4 align-top text-muted-foreground">
                      {busItem.route?.routeName ?? "-"}
                    </td>
                    <td className="px-4 py-4 align-top text-foreground">
                      {busItem.passengerCount} / {busItem.maxPassengers}
                    </td>
                    <td className="px-4 py-4 align-top text-foreground">
                      {busItem.maxPassengers}
                    </td>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(busItem)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteBus(busItem.id)}
                          disabled={deleteBusMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredBuses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
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
            <DialogTitle>
              {editingBus ? "Edit Bus" : "Tambah Bus Baru"}
            </DialogTitle>
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
                  onChange={(event) =>
                    setFormValues({
                      ...formValues,
                      busCode: event.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plateNumber">Nomor Polisi</Label>
                <Input
                  id="plateNumber"
                  value={formValues.plateNumber}
                  onChange={(event) =>
                    setFormValues({
                      ...formValues,
                      plateNumber: event.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="maxPassengers">Kapasitas Maksimal</Label>
                <Input
                  id="maxPassengers"
                  type="number"
                  min="1"
                  value={formValues.maxPassengers}
                  onChange={(event) =>
                    setFormValues({
                      ...formValues,
                      maxPassengers: event.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="route">Route</Label>
                <select
                  id="route"
                  value={formValues.routeId ?? ""}
                  onChange={(event) =>
                    setFormValues({
                      ...formValues,
                      routeId: event.target.value || null,
                    })
                  }
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pilih rute (opsional)</option>
                  {routeOptions.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.routeName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formValues.isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setFormValues({ ...formValues, isActive: true })
                    }
                  >
                    Aktif
                  </Button>
                  <Button
                    type="button"
                    variant={!formValues.isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setFormValues({ ...formValues, isActive: false })
                    }
                  >
                    Nonaktif
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={resetDialog} disabled={isSaving}>
              Batal
            </Button>
            <Button type="button" onClick={saveBus} disabled={isSaving}>
              {editingBus
                ? updateBusMutation.isPending
                  ? "Menyimpan..."
                  : "Simpan Perubahan"
                : createBusMutation.isPending
                  ? "Menambahkan..."
                  : "Tambah Bus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
