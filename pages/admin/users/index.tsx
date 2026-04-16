import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/layout";
import UserForm from "@/components/user/UserForm";
import UserTable from "@/components/user/UserTable";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string; 
}

export default function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State untuk Search dan Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"Semua" | "ADMIN" | "USER">("Semua");

  // AMBIL DATA DARI LOCAL STORAGE
  useEffect(() => {
    // Kita jalankan di useEffect agar tidak error Hydration di Next.js
    const storedUsers = localStorage.getItem("usersData");
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    }
    setIsLoading(false);
  }, []);

  // FUNGSI SIMPAN & UPDATE DATA KE LOCAL STORAGE
  const handleSubmit = (data: Omit<User, "id" | "createdAt" | "updatedAt">, id?: string) => {
    let updatedUsers: User[];

    if (id) {
      // PROSES EDIT: Cari user berdasarkan ID, lalu timpa datanya
      updatedUsers = users.map((u) => 
        u.id === id ? { ...u, ...data } : u
      );
    } else {
      // PROSES TAMBAH: Buat ID acak dan tanggal dibuat, lalu taruh di urutan paling atas array
      const newUser: User = {
        id: Date.now().toString(), // Generate ID unik pakai waktu
        ...data,
        createdAt: new Date().toISOString(),
      };
      updatedUsers = [newUser, ...users];
    }

    // Update state agar tabel langsung berubah
    setUsers(updatedUsers);
    
    // Simpan ke localStorage
    localStorage.setItem("usersData", JSON.stringify(updatedUsers));

    // Tutup form
    setIsFormOpen(false);
    setEditUser(null);
  };

  // FUNGSI EDIT
  const handleEdit = (user: User) => {
    setEditUser(user);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // FUNGSI HAPUS
  const handleDelete = (id: string) => {
    if (!confirm("Yakin ingin menghapus data user ini?")) return;
    
    // Filter out / buang user yang ID-nya dihapus
    const updatedUsers = users.filter((u) => u.id !== id);
    
    // Update state & localStorage
    setUsers(updatedUsers);
    localStorage.setItem("usersData", JSON.stringify(updatedUsers));
  };

  const handleAddNew = () => {
    setEditUser(null);
    setIsFormOpen(true);
  };

  // Kalkulasi Statistik
  const totalUsers = users.length;
  const totalAdmin = users.filter(u => u.role === 'ADMIN').length;
  const totalUserBiasa = users.filter(u => u.role === 'USER').length;
  const totalVerified = users.filter(u => u.emailVerified).length;

  // Filter Data Tabel
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterRole === "Semua" ? true : user.role === filterRole;
    return matchesSearch && matchesFilter;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kelola Data Pengguna</h1>
            <p className="text-gray-500 text-sm mt-1">Tambah, edit, dan pantau peran pengguna sistem Anda (Mode Local Storage)</p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={isFormOpen && !editUser ? () => setIsFormOpen(false) : handleAddNew} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-md"
            >
              {isFormOpen && !editUser ? (
                <span>Batal Tambah</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  <span>Tambah User Baru</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900">Total Pengguna</h3>
            <p className="text-3xl font-bold text-gray-900 mt-3">{totalUsers}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900">Admin Aktif</h3>
            <p className="text-3xl font-bold text-gray-900 mt-3">{totalAdmin}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900">User Biasa</h3>
            <p className="text-3xl font-bold text-gray-900 mt-3">{totalUserBiasa}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900">Email Terverifikasi</h3>
            <p className="text-3xl font-bold text-gray-900 mt-3">{totalVerified}</p>
          </div>
        </div>

        {/* FORM */}
        {isFormOpen && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <UserForm key={editUser ? editUser.id : 'create-new-user'} onSubmit={handleSubmit} editUser={editUser} />
          </div>
        )}

        {/* TABLE SECTION */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Daftar Pengguna</h2>
              <p className="text-sm text-gray-500">Cari berdasarkan nama atau email.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input 
                  type="text" 
                  placeholder="Cari user..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                />
              </div>

              <div className="flex bg-gray-100 rounded-full p-1 border border-gray-200">
                {(["Semua", "ADMIN", "USER"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterRole(tab)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${
                      filterRole === tab 
                        ? "bg-blue-600 text-white shadow" 
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center"><p className="text-gray-500 animate-pulse font-medium">Memuat data pengguna...</p></div>
          ) : (
            <UserTable users={filteredUsers} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </div>

      </div>
    </AdminLayout>
  );
}