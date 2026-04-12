import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";

import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  StationItem,
  useAdminStations,
  useCreateStationMutation,
  useDeleteStationMutation,
  useUpdateStationMutation,
} from "@/lib/hooks/use-admin-stations";

const stationFormSchema = z.object({
  name: z.string().trim().min(1, "Nama halte wajib diisi"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().positive(),
});

type StationFormInput = z.input<typeof stationFormSchema>;
type StationFormValues = z.output<typeof stationFormSchema>;

const defaults: StationFormValues = {
  name: "",
  latitude: -7.2575,
  longitude: 112.7521,
  radius: 50,
};

export default function AdminStationsPage() {
  const [search, setSearch] = useState("");
  const [editingStation, setEditingStation] = useState<StationItem | null>(null);
  const [deletingStationId, setDeletingStationId] = useState<string | null>(null);

  const stationsQuery = useAdminStations(search);
  const createStationMutation = useCreateStationMutation();
  const updateStationMutation = useUpdateStationMutation();
  const deleteStationMutation = useDeleteStationMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StationFormInput, unknown, StationFormValues>({
    resolver: zodResolver(stationFormSchema),
    defaultValues: defaults,
  });

  const onEdit = (station: StationItem) => {
    setEditingStation(station);
    setValue("name", station.name);
    setValue("latitude", station.latitude);
    setValue("longitude", station.longitude);
    setValue("radius", station.radius);
  };

  const resetForm = () => {
    setEditingStation(null);
    reset(defaults);
  };

  const onSubmit = async (values: StationFormValues) => {
    try {
      if (editingStation) {
        await updateStationMutation.mutateAsync({
          id: editingStation.id,
          payload: values,
        });
        toast.success("Halte berhasil diperbarui");
      } else {
        await createStationMutation.mutateAsync(values);
        toast.success("Halte berhasil ditambahkan");
      }

      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan halte");
    }
  };

  const onDelete = async (id: string) => {
    setDeletingStationId(id);

    try {
      await deleteStationMutation.mutateAsync(id);
      toast.success("Halte berhasil dihapus");

      if (editingStation?.id === id) {
        resetForm();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus halte");
    } finally {
      setDeletingStationId(null);
    }
  };

  const stations = stationsQuery.data?.stations ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Manajemen Halte</h1>
          <p className="text-muted-foreground">
            Atur data halte untuk geofencing tap in dan tap out.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingStation ? "Edit Halte" : "Tambah Halte"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid gap-2">
                <Label htmlFor="name">Nama Halte</Label>
                <Input id="name" {...register("name")} />
                {errors.name ? (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                ) : null}
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input id="latitude" type="number" step="any" {...register("latitude")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    {...register("longitude")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="radius">Radius (meter)</Label>
                  <Input id="radius" type="number" {...register("radius")} />
                </div>
              </div>

              {(errors.latitude || errors.longitude || errors.radius) && (
                <p className="text-sm text-destructive">
                  Pastikan latitude/longitude/radius valid.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    createStationMutation.isPending ||
                    updateStationMutation.isPending
                  }
                >
                  {editingStation
                    ? updateStationMutation.isPending
                      ? "Menyimpan..."
                      : "Simpan Perubahan"
                    : createStationMutation.isPending
                      ? "Menambahkan..."
                      : "Tambah Halte"}
                </Button>
                {editingStation ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={
                      createStationMutation.isPending || updateStationMutation.isPending
                    }
                  >
                    Batal Edit
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Halte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="searchStation">Cari halte</Label>
              <Input
                id="searchStation"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari berdasarkan nama halte"
              />
            </div>

            {stationsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat data halte...</p>
            ) : null}

            {stationsQuery.isError ? (
              <p className="text-sm text-destructive">
                {stationsQuery.error instanceof Error
                  ? stationsQuery.error.message
                  : "Gagal memuat data halte"}
              </p>
            ) : null}

            {!stationsQuery.isLoading && !stationsQuery.isError ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Nama</th>
                      <th className="px-2 py-2 font-medium">Latitude</th>
                      <th className="px-2 py-2 font-medium">Longitude</th>
                      <th className="px-2 py-2 font-medium">Radius</th>
                      <th className="px-2 py-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stations.length ? (
                      stations.map((station) => (
                        <tr key={station.id} className="border-b">
                          <td className="px-2 py-3 font-medium">{station.name}</td>
                          <td className="px-2 py-3">{station.latitude}</td>
                          <td className="px-2 py-3">{station.longitude}</td>
                          <td className="px-2 py-3">{station.radius} m</td>
                          <td className="px-2 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => onEdit(station)}
                                disabled={deleteStationMutation.isPending}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={deleteStationMutation.isPending}
                                onClick={() => onDelete(station.id)}
                              >
                                {deleteStationMutation.isPending &&
                                deletingStationId === station.id
                                  ? "Menghapus..."
                                  : "Hapus"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-2 py-3 text-muted-foreground">
                          Belum ada data halte.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
