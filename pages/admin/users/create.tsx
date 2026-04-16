import { useRouter } from "next/router";
import { AdminLayout } from "@/components/admin/layout";
import UserForm from "@/components/user/UserForm";

interface UserData {
  name: string;
  email: string;
}

export default function CreateUserPage() {
  const router = useRouter();

  const handleCreate = async (data: UserData) => {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    router.push("/admin/users");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tambah User</h1>
          <p className="text-muted-foreground text-sm">Isi data user baru di bawah ini</p>
        </div>
        <UserForm onSubmit={handleCreate} />
      </div>
    </AdminLayout>
  );
}