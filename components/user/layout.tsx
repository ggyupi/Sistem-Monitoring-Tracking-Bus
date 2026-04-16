import { ReactNode } from "react";

import { UserSidebar } from "@/components/user/sidebar";

type UserLayoutProps = {
  children: ReactNode;
};

export function UserLayout({ children }: UserLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <UserSidebar className="hidden md:flex" />

      <main className="flex-1 p-4 md:p-8 md:ml-64">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
