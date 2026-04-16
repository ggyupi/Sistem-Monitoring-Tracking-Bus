import { useRouter } from "next/router";
import type { GetServerSideProps, NextPage } from "next";
import { useMemo } from "react";

import { UserLayout } from "@/components/user/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionFromRequest } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";

type BusTrackingItem = {
  id: string;
  busCode: string;
  plateNumber: string;
};

type BusPassenger = {
  rfidTag: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type PenumpangPageProps = {
  buses: BusTrackingItem[];
  selectedBusId: string;
  passengers: BusPassenger[];
};

const PenumpangPage: NextPage<PenumpangPageProps> = ({ buses, selectedBusId, passengers }) => {
  const router = useRouter();

  const selectedBus = useMemo(
    () => buses.find((bus) => bus.id === selectedBusId),
    [buses, selectedBusId],
  );

  const handleSelect = (busId: string) => {
    router.push({
      pathname: "/user/penumpang",
      query: busId ? { busId } : {},
    });
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
          <h1 className="text-3xl font-bold">Penumpang Bus</h1>
          <p className="text-muted-foreground">
            Lihat daftar penumpang yang sedang berada dalam bus.
          </p>
        </div>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle>Daftar Penumpang</CardTitle>
            <CardDescription>Pilih bus untuk melihat data penumpang.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <select
                value={selectedBusId}
                onChange={(e) => handleSelect(e.target.value)}
                className="w-full rounded border border-border bg-background p-2 text-sm"
              >
                <option value="">Pilih bus...</option>
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.busCode} - {bus.plateNumber}
                  </option>
                ))}
              </select>

              {selectedBusId ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-semibold">Bus Terpilih</p>
                    <p className="text-sm text-muted-foreground">{selectedBus?.busCode} - {selectedBus?.plateNumber}</p>
                  </div>

                  {passengers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Tidak ada penumpang di bus ini.</p>
                  ) : (
                    <div className="space-y-3">
                      {passengers.map((passenger) => (
                        <div key={passenger.rfidTag} className="rounded-xl border border-border bg-background p-4">
                          <p className="text-sm font-semibold">RFID: {passenger.rfidTag}</p>
                          {passenger.user ? (
                            <p className="text-sm text-muted-foreground">Nama: {passenger.user.name}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Pengguna tidak terdaftar</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Silakan pilih bus di atas untuk melihat daftar penumpang.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
};

export const getServerSideProps: GetServerSideProps<PenumpangPageProps> = async (context) => {
  const session = await getSessionFromRequest(context.req);

  if (!session?.user) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  const buses = await prisma.bus.findMany({
    where: { isActive: true },
    select: {
      id: true,
      busCode: true,
      plateNumber: true,
    },
  });

  const selectedBusId = String(context.query.busId ?? "");

  const passengers = selectedBusId
    ? await prisma.card.findMany({
        where: {
          lastBusId: selectedBusId,
          isInside: true,
        },
        select: {
          rfidTag: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    : [];

  return {
    props: {
      buses,
      selectedBusId,
      passengers,
    },
  };
};

export default PenumpangPage;
