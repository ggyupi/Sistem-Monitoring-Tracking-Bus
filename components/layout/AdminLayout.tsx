import { AdminSidebar } from "./AdminSidebar";
import { AdminNavbar } from "./AdminNavbar";
import { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1">
        <AdminNavbar />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}