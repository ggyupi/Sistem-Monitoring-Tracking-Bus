import { useRouter } from "next/router";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/layout";
import UserForm from "@/components/user/UserForm";

interface User {
  id: number;
  name: string;
  email: string;
}

export default function EditUserPage() {
  const router = useRouter();
  const { id } = router.query;

const [user, setUser] = useState<User | null>(null);

  const handleUpdate = (data: Omit<User, "id">) => {
    const stored = localStorage.getItem("users");
    if (!stored) return;

    let users: User[] = JSON.parse(stored);

    users = users.map((u) =>
      u.id === Number(id) ? { ...u, ...data } : u
    );

    localStorage.setItem("users", JSON.stringify(users));

    router.push("/admin/users");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit User</h1>
          <p className="text-muted-foreground text-sm">
            Ubah data user sesuai kebutuhan
          </p>
        </div>

        {user ? (
          <UserForm onSubmit={handleUpdate} editUser={user} />
        ) : (
          <p className="text-muted-foreground">Loading...</p>
        )}
      </div>
    </AdminLayout>
  );
}