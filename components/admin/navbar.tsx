import { useState } from "react";

import { Bell, Search, UserCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminNavbar() {
  const [search, setSearch] = useState("");

  return (
    <div className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar py-3">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        {/* Branding */}
        <div className="font-semibold text-primary shrink-0">
          BusControl Admin
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs">
          <div className="relative flex w-full items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search fleet or RFID..."
              className="pl-9 h-9 bg-background"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" type="button" className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" type="button" className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent">
            <UserCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
