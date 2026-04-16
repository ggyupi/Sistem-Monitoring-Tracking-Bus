import type { GetServerSideProps, NextPage } from "next";

import { UserLayout } from "@/components/user/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionFromRequest } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";

type UserCard = {
  rfidTag: string;
  balance: number;
  status: string;
};

type UserPageProps = {
  userName: string;
  cards: UserCard[];
};

const UserPage: NextPage<UserPageProps> = ({ userName, cards }) => {
  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
          <h1 className="text-3xl font-bold">Selamat datang, {userName}!</h1>
          <p className="text-muted-foreground">
            Ini adalah halaman dashboard pengguna. Di sini kamu dapat melihat data kartu RFID dan saldo.
          </p>
        </div>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle>Kartu RFID</CardTitle>
            <CardDescription>Informasi kartu yang terkait dengan akun Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <CardsList cards={cards} />
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
};

function CardsList({ cards }: { cards: UserCard[] }) {
  if (!cards || cards.length === 0) {
    return <div className="text-sm text-muted-foreground">Belum ada kartu RFID terdaftar.</div>;
  }

  return (
    <div className="space-y-4">
      {cards.map((card) => (
        <div key={card.rfidTag} className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-semibold">ID Kartu: {card.rfidTag}</p>
          <p className="text-sm text-muted-foreground">Saldo: Rp {card.balance.toLocaleString("id-ID")}</p>
          <p className="text-sm text-muted-foreground">Status: {card.status}</p>
        </div>
      ))}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<UserPageProps> = async (context) => {
  const session = await getSessionFromRequest(context.req);

  if (!session?.user) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  const userName = session.user.name || session.user.email || "Pengguna";

  const cards = await prisma.card.findMany({
    where: { userId: session.user.id },
    select: {
      rfidTag: true,
      balance: true,
      status: true,
    },
  });

  return {
    props: {
      userName,
      cards,
    },
  };
};

export default UserPage;

