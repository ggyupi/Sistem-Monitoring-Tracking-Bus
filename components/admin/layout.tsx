import { ReactNode, CSSProperties, useState } from "react";

import { AdminNavbar } from "@/components/admin/navbar";
import { AdminSidebar } from "@/components/admin/sidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(256);

  return (
    <div
      className="relative min-h-screen bg-background"
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <AdminSidebar
        className="hidden md:flex"
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
      />

      <main className="flex-1 transition-all duration-200 md:ml-[var(--sidebar-width)]">
        <AdminNavbar />
        <div className="p-4 md:p-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
