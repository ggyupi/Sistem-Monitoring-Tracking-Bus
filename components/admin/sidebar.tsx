"use client";

import {
  BusFront,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Route,
  ReceiptText,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";

import { buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const defaultItems: SidebarItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Buses", href: "/admin/buses", icon: BusFront },
  { label: "Routes", href: "/admin/routes", icon: Route },
  { label: "Stations", href: "/admin/stations", icon: MapPinned },
  { label: "Cards", href: "/admin/cards", icon: CreditCard },
  { label: "Transactions", href: "/admin/transactions", icon: ReceiptText },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Roles", href: "/admin/roles", icon: Shield },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

type AdminSidebarProps = {
  className?: string;
  items?: SidebarItem[];
};

export function AdminSidebar({
  className,
  items = defaultItems,
}: AdminSidebarProps) {
  // fitur drag to resize sidebar, masih buggy, nanti diperbaiki
  const [collapsed, setCollapsed] = useState(false);
  // fitur drag to resize sidebar, masih buggy, nanti diperbaiki

  const router = useRouter();

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();

    if (error) {
      toast.error(error.message ?? "Gagal logout");
      return;
    }

    toast.success("Berhasil logout");
    await router.push("/auth/login");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className="mb-6 px-4 pt-6">
        <div className="flex items-center justify-between">
          {/* TITLE (TIDAK HILANG, CUMA FADE) */}
          <div
            className={cn(
              "transition-all duration-300 origin-left",
              collapsed
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
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-2 hover:bg-sidebar-accent transition"
          >
            {collapsed ? "👉" : "👈"}
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
                  collapsed ? "scale-0 opacity-0 w-0" : "scale-100 opacity-100",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ================= FOOTER ================= */}
      <div className="mt-auto border-t border-sidebar-border p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition"
        >
          <LogOut className="w-5 h-5 shrink-0" />

          <span
            className={cn(
              "transition-all duration-200 origin-left",
              collapsed ? "scale-0 opacity-0 w-0" : "scale-100 opacity-100",
            )}
          >
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
