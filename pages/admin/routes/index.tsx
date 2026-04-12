import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";

import { AdminLayout } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RouteItem,
  useAdminRoutes,
  useCreateRouteMutation,
  useDeleteRouteMutation,
  useUpdateRouteMutation,
} from "@/lib/hooks/use-admin-routes";

const routeFormSchema = z.object({
  routeName: z.string().trim().min(1, "Nama rute wajib diisi"),
  pathGeoJSONText: z
    .string()
    .trim()
    .min(1, "Path GeoJSON wajib diisi")
    .refine((value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }, "Path GeoJSON harus berupa JSON valid"),
  stationIds: z.array(z.string()).default([]),
});

type RouteFormInput = z.input<typeof routeFormSchema>;
type RouteFormValues = z.output<typeof routeFormSchema>;

const defaults: RouteFormValues = {
  routeName: "",
  pathGeoJSONText: '{"type":"LineString","coordinates":[]}',
  stationIds: [],
};

export default function AdminRoutesPage() {
  const [search, setSearch] = useState("");
  const [editingRoute, setEditingRoute] = useState<RouteItem | null>(null);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);

  const routesQuery = useAdminRoutes(search);
  const createRouteMutation = useCreateRouteMutation();
  const updateRouteMutation = useUpdateRouteMutation();
  const deleteRouteMutation = useDeleteRouteMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RouteFormInput, unknown, RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: defaults,
  });

  const routeList = useMemo(() => routesQuery.data?.routes ?? [], [routesQuery.data]);
  const stationOptions = useMemo(
    () => routesQuery.data?.stations ?? [],
    [routesQuery.data],
  );

  const selectedStationIds =
    useWatch({
      control,
      name: "stationIds",
    }) ?? [];

  const onEdit = (route: RouteItem) => {
    setEditingRoute(route);
    setValue("routeName", route.routeName);
    setValue("pathGeoJSONText", JSON.stringify(route.pathGeoJSON, null, 2));
    setValue(
      "stationIds",
      route.stations.map((item) => item.station.id),
    );
  };

  const resetForm = () => {
    setEditingRoute(null);
    reset(defaults);
  };

  const onSubmit = async (values: RouteFormValues) => {
    try {
      const payload = {
        routeName: values.routeName,
        pathGeoJSON: JSON.parse(values.pathGeoJSONText),
        stationIds: values.stationIds,
      };

      if (editingRoute) {
        await updateRouteMutation.mutateAsync({
          id: editingRoute.id,
          payload,
        });
        toast.success("Rute berhasil diperbarui");
      } else {
        await createRouteMutation.mutateAsync(payload);
        toast.success("Rute berhasil ditambahkan");
      }

      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan rute");
    }
  };

  const onDelete = async (id: string) => {
    setDeletingRouteId(id);

    try {
      await deleteRouteMutation.mutateAsync(id);
      toast.success("Rute berhasil dihapus");

      if (editingRoute?.id === id) {
        resetForm();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus rute");
    } finally {
      setDeletingRouteId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Manajemen Rute</h1>
          <p className="text-muted-foreground">
            Kelola trayek, path GeoJSON, dan urutan halte pada setiap rute.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingRoute ? "Edit Rute" : "Tambah Rute"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="grid gap-2">
                <Label htmlFor="routeName">Nama Rute</Label>
                <Input id="routeName" {...register("routeName")} />
                {errors.routeName ? (
                  <p className="text-sm text-destructive">{errors.routeName.message}</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pathGeoJSONText">Path GeoJSON</Label>
                <textarea
                  id="pathGeoJSONText"
                  className="min-h-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register("pathGeoJSONText")}
                />
                {errors.pathGeoJSONText ? (
                  <p className="text-sm text-destructive">
                    {errors.pathGeoJSONText.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label>Urutan Halte</Label>
                <div className="grid gap-2 rounded-md border border-input p-3">
                  {stationOptions.length ? (
                    stationOptions.map((station) => (
                      <label key={station.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          value={station.id}
                          checked={selectedStationIds.includes(station.id)}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            const current = selectedStationIds;

                            if (checked) {
                              setValue("stationIds", [...current, station.id]);
                              return;
                            }

                            setValue(
                              "stationIds",
                              current.filter((id) => id !== station.id),
                            );
                          }}
                        />
                        <span>{station.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Belum ada halte. Tambahkan halte terlebih dahulu.
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Urutan halte mengikuti urutan centang saat ini.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    createRouteMutation.isPending ||
                    updateRouteMutation.isPending
                  }
                >
                  {editingRoute
                    ? updateRouteMutation.isPending
                      ? "Menyimpan..."
                      : "Simpan Perubahan"
                    : createRouteMutation.isPending
                      ? "Menambahkan..."
                      : "Tambah Rute"}
                </Button>
                {editingRoute ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={createRouteMutation.isPending || updateRouteMutation.isPending}
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
            <CardTitle>Daftar Rute</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="searchRoute">Cari rute</Label>
              <Input
                id="searchRoute"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari berdasarkan nama rute"
              />
            </div>

            {routesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Memuat data rute...</p>
            ) : null}

            {routesQuery.isError ? (
              <p className="text-sm text-destructive">
                {routesQuery.error instanceof Error
                  ? routesQuery.error.message
                  : "Gagal memuat data rute"}
              </p>
            ) : null}

            {!routesQuery.isLoading && !routesQuery.isError ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Nama Rute</th>
                      <th className="px-2 py-2 font-medium">Jumlah Halte</th>
                      <th className="px-2 py-2 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeList.length ? (
                      routeList.map((route) => (
                        <tr key={route.id} className="border-b">
                          <td className="px-2 py-3 font-medium">{route.routeName}</td>
                          <td className="px-2 py-3">{route.stations.length}</td>
                          <td className="px-2 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => onEdit(route)}
                                disabled={deleteRouteMutation.isPending}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={deleteRouteMutation.isPending}
                                onClick={() => onDelete(route.id)}
                              >
                                {deleteRouteMutation.isPending && deletingRouteId === route.id
                                  ? "Menghapus..."
                                  : "Hapus"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-2 py-3 text-muted-foreground">
                          Belum ada data rute.
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
