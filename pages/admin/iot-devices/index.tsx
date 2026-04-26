import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";

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
  DeviceStatus,
  IotDeviceItem,
  useAdminIotDevices,
  useCreateIotDeviceMutation,
  useDeleteIotDeviceMutation,
  useUpdateIotDeviceMutation,
} from "@/lib/hooks/use-admin-iot-devices";
import {
  CheckCircle2,
  Cpu,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Trash2,
  Wifi,
} from "lucide-react";

const deviceFormSchema = z.object({
  serialNumber: z.string().trim().min(1, "Serial number wajib diisi"),
  deviceKey: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "RETIRED"]),
  firmwareVer: z.string().trim().optional(),
  currentBusId: z.string().trim().optional(),
});

type DeviceFormInput = z.input<typeof deviceFormSchema>;
type DeviceFormValues = z.output<typeof deviceFormSchema>;

type StatusFilter = "ALL" | DeviceStatus;

const defaultFormValues: DeviceFormValues = {
  serialNumber: "",
  deviceKey: "",
  status: "ACTIVE",
  firmwareVer: "",
  currentBusId: "",
};

const statusLabelMap: Record<DeviceStatus, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  RETIRED: "Retired",
};

const statusBadgeClassMap: Record<DeviceStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-900",
  INACTIVE: "bg-amber-100 text-amber-900",
  RETIRED: "bg-slate-200 text-slate-800",
};

function isDeviceOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return false;
  }

  const msSinceLastSeen = Date.now() - new Date(lastSeenAt).getTime();
  return msSinceLastSeen <= 5 * 60 * 1000;
}

function formatDateTime(dateValue: string | null) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function generateRandomToken(length: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}

function generateSerialNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `IOT-${datePart}-${generateRandomToken(6)}`;
}

function generateDeviceKey() {
  return `dev_${generateRandomToken(8)}_${generateRandomToken(8)}`;
}

export default function AdminIotDevicesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<IotDeviceItem | null>(
    null,
  );
  const [detailDevice, setDetailDevice] = useState<IotDeviceItem | null>(null);
  const [showFormDeviceKey, setShowFormDeviceKey] = useState(false);
  const [showDetailDeviceKey, setShowDetailDeviceKey] = useState(false);

  const devicesQuery = useAdminIotDevices(search);
  const createDeviceMutation = useCreateIotDeviceMutation();
  const updateDeviceMutation = useUpdateIotDeviceMutation();
  const deleteDeviceMutation = useDeleteIotDeviceMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<DeviceFormInput, unknown, DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: defaultFormValues,
  });

  const devices = useMemo(
    () => devicesQuery.data?.devices ?? [],
    [devicesQuery.data],
  );
  const buses = useMemo(
    () => devicesQuery.data?.buses ?? [],
    [devicesQuery.data],
  );

  const filteredDevices = useMemo(
    () =>
      devices.filter((device) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          device.serialNumber.toLowerCase().includes(query) ||
          device.currentBus?.busCode.toLowerCase().includes(query) ||
          device.currentBus?.plateNumber.toLowerCase().includes(query) ||
          (device.firmwareVer?.toLowerCase().includes(query) ?? false);

        const matchesStatus =
          statusFilter === "ALL" || device.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [devices, search, statusFilter],
  );

  const totalDevices = devices.length;
  const activeDevices = devices.filter(
    (device) => device.status === "ACTIVE",
  ).length;
  const assignedDevices = devices.filter((device) =>
    Boolean(device.currentBusId),
  ).length;
  const onlineDevices = devices.filter((device) =>
    isDeviceOnline(device.lastSeenAt),
  ).length;

  const isSaving =
    createDeviceMutation.isPending || updateDeviceMutation.isPending;

  const resetDialog = () => {
    setEditingDevice(null);
    setShowFormDeviceKey(false);
    reset(defaultFormValues);
    setIsDialogOpen(false);
  };

  const openCreateDialog = () => {
    setEditingDevice(null);
    reset(defaultFormValues);
    setIsDialogOpen(true);
  };

  const openEditDialog = (device: IotDeviceItem) => {
    setEditingDevice(device);
    setShowFormDeviceKey(false);
    reset({
      serialNumber: device.serialNumber,
      deviceKey: "",
      status: device.status,
      firmwareVer: device.firmwareVer ?? "",
      currentBusId: device.currentBusId ?? "",
    });
    setIsDialogOpen(true);
  };

  const openDetailDialog = (device: IotDeviceItem) => {
    setDetailDevice(device);
    setShowDetailDeviceKey(false);
    setIsDetailDialogOpen(true);
  };

  const submitForm = handleSubmit(async (values) => {
    try {
      if (!editingDevice && !values.deviceKey?.trim()) {
        setError("deviceKey", {
          type: "manual",
          message: "Device key wajib diisi untuk device baru",
        });
        return;
      }

      if (editingDevice) {
        await updateDeviceMutation.mutateAsync({
          id: editingDevice.id,
          payload: {
            serialNumber: values.serialNumber,
            status: values.status,
            firmwareVer: values.firmwareVer?.trim()
              ? values.firmwareVer.trim()
              : null,
            currentBusId: values.currentBusId?.trim()
              ? values.currentBusId.trim()
              : null,
            deviceKey: values.deviceKey?.trim()
              ? values.deviceKey.trim()
              : undefined,
          },
        });

        toast.success("IoT device berhasil diperbarui");
      } else {
        await createDeviceMutation.mutateAsync({
          serialNumber: values.serialNumber,
          status: values.status,
          firmwareVer: values.firmwareVer?.trim()
            ? values.firmwareVer.trim()
            : null,
          currentBusId: values.currentBusId?.trim()
            ? values.currentBusId.trim()
            : null,
          deviceKey: values.deviceKey!.trim(),
        });

        toast.success("IoT device berhasil ditambahkan");
      }

      resetDialog();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan IoT device",
      );
    }
  });

  const removeDevice = async (device: IotDeviceItem) => {
    const confirmed = window.confirm(
      `Hapus IoT device ${device.serialNumber}? Riwayat assignment pada device ini juga akan dihapus.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDeviceMutation.mutateAsync(device.id);
      toast.success("IoT device berhasil dihapus");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus IoT device",
      );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Manage IoT Devices
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Kelola device tracker, assignment ke bus, dan status operasional
              secara real-time.
            </p>
          </div>

          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2" /> Tambah Device
          </Button>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Device
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <span className="text-4xl font-semibold text-foreground">
                {totalDevices}
              </span>
              <Cpu className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Device Aktif
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <span className="text-4xl font-semibold text-foreground">
                {activeDevices}
              </span>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Terpasang ke Bus
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <span className="text-4xl font-semibold text-foreground">
                {assignedDevices}
              </span>
              <Radio className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Online (5 menit)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <span className="text-4xl font-semibold text-foreground">
                {onlineDevices}
              </span>
              <Wifi className="h-5 w-5 text-sky-600" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Daftar IoT Device</CardTitle>
              <CardDescription>
                Cari berdasarkan serial, firmware, kode bus, atau plat nomor.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 shadow-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari device"
                  className="border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border bg-background p-1 text-sm shadow-sm">
                {(["ALL", "ACTIVE", "INACTIVE", "RETIRED"] as const).map(
                  (option) => (
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
                      {option === "ALL" ? "Semua" : statusLabelMap[option]}
                    </button>
                  ),
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {devicesQuery.isLoading ? (
              <p className="px-2 py-6 text-sm text-muted-foreground">
                Memuat data IoT device...
              </p>
            ) : null}

            {devicesQuery.isError ? (
              <p className="px-2 py-6 text-sm text-destructive">
                {devicesQuery.error instanceof Error
                  ? devicesQuery.error.message
                  : "Gagal memuat data IoT device"}
              </p>
            ) : null}

            {!devicesQuery.isLoading && !devicesQuery.isError ? (
              <table className="min-w-full border-separate border-spacing-y-3 text-left">
                <thead>
                  <tr className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
                    <th className="px-4 py-3">Serial</th>
                    <th className="px-4 py-3">Bus</th>
                    <th className="px-4 py-3">Firmware</th>
                    <th className="px-4 py-3">Last Seen</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Diupdate</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((device) => {
                    const isOnline = isDeviceOnline(device.lastSeenAt);

                    return (
                      <tr
                        key={device.id}
                        className="rounded-[18px] border border-border bg-card text-sm shadow-sm"
                      >
                        <td className="px-4 py-4 align-top font-medium text-foreground">
                          <div className="flex flex-col gap-1">
                            <span>{device.serialNumber}</span>
                            <span className="text-xs text-muted-foreground">
                              {device.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-muted-foreground">
                          {device.currentBus ? (
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-foreground">
                                {device.currentBus.busCode}
                              </span>
                              <span className="text-xs">
                                {device.currentBus.plateNumber}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-muted-foreground">
                          {device.firmwareVer ?? "-"}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-foreground">
                              {formatDateTime(device.lastSeenAt)}
                            </span>
                            <span
                              className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
                                isOnline
                                  ? "bg-emerald-100 text-emerald-900"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {isOnline ? "Online" : "Offline"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClassMap[device.status]}`}
                          >
                            {statusLabelMap[device.status]}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top text-muted-foreground">
                          {formatDateTime(device.updatedAt)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetailDialog(device)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(device)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeDevice(device)}
                              disabled={deleteDeviceMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-muted-foreground"
                      >
                        Tidak ada IoT device yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border border-border bg-card">
          <DialogHeader>
            <DialogTitle>
              {editingDevice ? "Edit IoT Device" : "Tambah IoT Device"}
            </DialogTitle>
            <DialogDescription>
              Simpan serial device, status, firmware, dan assignment bus pada
              tracker.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 py-2" onSubmit={submitForm}>
            <div className="grid gap-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <div className="flex items-center gap-2">
                <Input id="serialNumber" {...register("serialNumber")} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setValue("serialNumber", generateSerialNumber())
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {errors.serialNumber ? (
                <p className="text-sm text-destructive">
                  {errors.serialNumber.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="deviceKey">
                  Device Key{" "}
                  {editingDevice ? "(kosongkan jika tidak diganti)" : ""}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="deviceKey"
                    type={showFormDeviceKey ? "text" : "password"}
                    autoComplete="new-password"
                    {...register("deviceKey")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFormDeviceKey((value) => !value)}
                    aria-label={
                      showFormDeviceKey ? "Sembunyikan key" : "Tampilkan key"
                    }
                  >
                    {showFormDeviceKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setValue("deviceKey", generateDeviceKey())}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                </div>
                {errors.deviceKey ? (
                  <p className="text-sm text-destructive">
                    {errors.deviceKey.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="firmwareVer">Firmware Version</Label>
                <Input
                  id="firmwareVer"
                  placeholder="Contoh: v1.3.7"
                  {...register("firmwareVer")}
                />
                {errors.firmwareVer ? (
                  <p className="text-sm text-destructive">
                    {errors.firmwareVer.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="status">Status Device</Label>
                <select
                  id="status"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register("status")}
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                  <option value="RETIRED">Retired</option>
                </select>
                {errors.status ? (
                  <p className="text-sm text-destructive">
                    {errors.status.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="currentBusId">Assignment Bus</Label>
                <select
                  id="currentBusId"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register("currentBusId")}
                >
                  <option value="">Belum di-assign</option>
                  {buses.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.busCode} - {bus.plateNumber}
                      {bus.isActive ? "" : " (Nonaktif)"}
                    </option>
                  ))}
                </select>
                {errors.currentBusId ? (
                  <p className="text-sm text-destructive">
                    {errors.currentBusId.message}
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={resetDialog}
                disabled={isSaving}
                type="button"
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSaving}>
                {editingDevice
                  ? updateDeviceMutation.isPending
                    ? "Menyimpan..."
                    : "Simpan Perubahan"
                  : createDeviceMutation.isPending
                    ? "Menambahkan..."
                    : "Tambah Device"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl rounded-3xl border border-border bg-card">
          <DialogHeader>
            <DialogTitle>Detail IoT Device</DialogTitle>
            <DialogDescription>
              Informasi lengkap device termasuk assignment dan key hash.
            </DialogDescription>
          </DialogHeader>

          {detailDevice ? (
            <div className="space-y-4 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Device ID</p>
                  <p className="mt-1 break-all text-sm font-medium text-foreground">
                    {detailDevice.id}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Serial Number</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {detailDevice.serialNumber}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Device Key (Hash)
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDetailDeviceKey((value) => !value)}
                  >
                    {showDetailDeviceKey ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" /> Hide
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" /> Show
                      </>
                    )}
                  </Button>
                </div>
                <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
                  {showDetailDeviceKey
                    ? detailDevice.deviceKeyHash
                    : "•".repeat(
                        Math.max(16, detailDevice.deviceKeyHash.length),
                      )}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {statusLabelMap[detailDevice.status]}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Firmware</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {detailDevice.firmwareVer ?? "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Last Seen</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatDateTime(detailDevice.lastSeenAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Current Bus</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {detailDevice.currentBus
                      ? `${detailDevice.currentBus.busCode} - ${detailDevice.currentBus.plateNumber}`
                      : "Belum di-assign"}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Created At</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatDateTime(detailDevice.createdAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Updated At</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatDateTime(detailDevice.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Riwayat Assignment
                </p>
                <div className="max-h-48 overflow-auto">
                  {detailDevice.assignments.length ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="px-2 py-2 font-medium">Bus</th>
                          <th className="px-2 py-2 font-medium">Assigned</th>
                          <th className="px-2 py-2 font-medium">Unassigned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailDevice.assignments.map((assignment) => (
                          <tr key={assignment.id} className="border-b">
                            <td className="px-2 py-2 text-foreground">
                              {assignment.bus.busCode} -{" "}
                              {assignment.bus.plateNumber}
                            </td>
                            <td className="px-2 py-2 text-muted-foreground">
                              {formatDateTime(assignment.assignedAt)}
                            </td>
                            <td className="px-2 py-2 text-muted-foreground">
                              {formatDateTime(assignment.unassignedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Belum ada riwayat assignment.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDetailDialogOpen(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
