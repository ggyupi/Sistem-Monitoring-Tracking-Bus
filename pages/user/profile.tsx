import type { GetServerSideProps, NextPage } from "next";
import { useState } from "react";

import { UserLayout } from "@/components/user/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionFromRequest } from "@/lib/api-session";

type ProfilePageProps = {
  userName: string;
  userEmail: string;
};

const ProfilePage: NextPage<ProfilePageProps> = ({ userName, userEmail }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userName);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    const response = await fetch("/api/user/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, email: userEmail }),
    });

    if (response.ok) {
      alert("Profil berhasil diperbarui");
      setIsEditing(false);
    } else {
      alert("Gagal memperbarui profil");
    }
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
          <h1 className="text-3xl font-bold">Profil Pengguna</h1>
          <p className="text-muted-foreground">Kelola informasi profil Anda di sini.</p>
        </div>

        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle>Informasi Profil</CardTitle>
            <CardDescription>Detail akun pengguna Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-semibold">Nama</p>
                <p className="text-sm text-muted-foreground">{userName}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-semibold">Email</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
              <button onClick={handleEditToggle} className="mt-4 w-full rounded-md bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-primary-dark">
                Edit Profil
              </button>
            </div>
          </CardContent>
        </Card>

        {isEditing && (
          <Card className="border border-border bg-card mt-6">
            <CardHeader>
              <CardTitle>Edit Profil</CardTitle>
              <CardDescription>Perbarui informasi profil Anda.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div>
                  <label htmlFor="editName" className="block text-sm font-medium text-muted-foreground">
                    Nama Baru
                  </label>
                  <input type="text" id="editName" value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 block w-full rounded-md border border-border bg-background p-2 text-sm" />
                </div>
                <button type="button" onClick={handleSave} className="mt-4 w-full rounded-md bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-primary-dark">
                  Simpan Perubahan
                </button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </UserLayout>
  );
};

export const getServerSideProps: GetServerSideProps<ProfilePageProps> = async (context) => {
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
  const userEmail = session.user.email || "Tidak ada email";

  return {
    props: {
      userName,
      userEmail,
    },
  };
};

export default ProfilePage;
