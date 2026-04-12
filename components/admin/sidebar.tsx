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
      className={cn("flex h-full w-72 flex-col border-r bg-card", className)}
    >
      <div className="border-b px-4 py-4">
        <p className="text-sm font-semibold text-foreground">Admin Panel</p>
        <p className="text-xs text-muted-foreground">
          Kelola pengguna dan konfigurasi aplikasi
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => {
          const active =
            router.pathname === item.href ||
            (item.href !== "/admin" && router.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({
                  variant: active ? "secondary" : "ghost",
                  size: "sm",
                }),
                "w-full justify-start",
              )}
            >
              <item.icon data-icon="inline-start" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <button
          type="button"
          onClick={handleSignOut}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full justify-start",
          )}
        >
          <LogOut data-icon="inline-start" />
          Logout
        </button>
      </div>
    </aside>
  );
}
