"use client";

import {
  BusFront,
  Cpu,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MapPinned,
  ReceiptText,
  Route,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
// Ikon yang kita gunakan untuk Sidebar dan Profile
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";

/** * Fungsi helper 'cn' (biasanya ada di folder lib/utils.ts)
 * Jika kamu belum punya, kamu bisa buat sendiri seperti ini:
 */

type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const defaultItems: SidebarItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Buses", href: "/admin/buses", icon: BusFront },
  { label: "IoT Devices", href: "/admin/iot-devices", icon: Cpu },
  { label: "Routes", href: "/admin/routes", icon: Route },
  { label: "Stations", href: "/admin/stations", icon: MapPinned },
  { label: "Cards", href: "/admin/cards", icon: CreditCard },
  { label: "Transactions", href: "/admin/transactions", icon: ReceiptText },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

type AdminSidebarProps = {
  className?: string;
  items?: SidebarItem[];
  width?: number;
  onWidthChange?: (width: number) => void;
};

export function AdminSidebar({
  className,
  items = defaultItems,
  width = 256,
  onWidthChange,
}: AdminSidebarProps) {
  const router = useRouter();
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);
  const isCollapsed = width <= 96;

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();

    if (error) {
      toast.error(error.message ?? "Gagal logout");
      return;
    }

    toast.success("Berhasil logout");
    await router.push("/auth/login");
  };

  const clampWidth = (nextWidth: number) => {
    const minWidth = 96;
    const maxWidth = 360;
    onWidthChange?.(Math.min(maxWidth, Math.max(minWidth, nextWidth)));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragState.current = {
      startX: event.clientX,
      startWidth: width,
    };

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      if (!dragState.current) return;
      const deltaX = moveEvent.clientX - dragState.current.startX;
      clampWidth(dragState.current.startWidth + deltaX);
    };

    const handlePointerUp = () => {
      dragState.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 ease-in-out",
        className,
      )}
      style={{ width: `${width}px` }}
    >
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent hover:bg-sidebar-accent/10"
        onPointerDown={handlePointerDown}
      />
      <div className="mb-6 px-4 pt-6">
        <div className="flex items-center justify-between">
          {/* TITLE (TIDAK HILANG, CUMA FADE) */}
          <div
            className={cn(
              "transition-all duration-300 origin-left",
              isCollapsed
                ? "scale-0 opacity-0 w-0"
                : "scale-100 opacity-100 w-auto",
            )}
          >
            <div className="flex flex-col min-w-max">
              <h1 className="text-xl font-bold tracking-tight text-primary leading-none">
                BusControl
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                IoT Monitoring System
              </p>
            </div>
          </div>

          {/* TOGGLE */}
          <button
            onClick={() => onWidthChange?.(isCollapsed ? 256 : 96)}
            className="rounded-lg p-2 hover:bg-sidebar-accent transition-all duration-300 flex items-center justify-center"
          >
            {isCollapsed ? (
              <>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                <GripVertical className="h-5 w-5 text-muted-foreground/50" />
              </>
            ) : (
              <div className="flex items-center gap-1">
                <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ================= NAV ================= */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {items.map((item) => {
          const active =
            router.pathname === item.href ||
            (item.href !== "/admin" && router.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              {/* ICON (FIX SIZE) */}
              <item.icon className="w-5 h-5 shrink-0" />

              {/* TEXT */}
              <span
                className={cn(
                  "transition-all duration-200 origin-left",
                  isCollapsed
                    ? "scale-0 opacity-0 w-0"
                    : "scale-100 opacity-100",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ================= FOOTER ================= */}
      <div className="mb-3 flex w-full items-center px-2 py-2">
        {/* Container Avatar dengan lebar tetap agar tidak geser */}
        <div className="flex w-12 shrink-0 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-300">
            <span className="text-sm font-semibold">AU</span>
          </div>
        </div>

        {/* Info Teks */}
        <div
          className={cn(
            "flex flex-col transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
            isCollapsed
              ? "w-0 opacity-0 pointer-events-none"
              : "w-auto opacity-100 ml-2", // Berikan margin kiri hanya saat terbuka
          )}
        >
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Admin User
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
            Fleet Manager
          </span>
        </div>
      </div>
      <div className="mt-auto border-t border-sidebar-border p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition"
        >
          <LogOut className="w-5 h-5 shrink-0" />

          <span
            className={cn(
              "transition-all duration-200 origin-left",
              isCollapsed ? "scale-0 opacity-0 w-0" : "scale-100 opacity-100",
            )}
          >
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
