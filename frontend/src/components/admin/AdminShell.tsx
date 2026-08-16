import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAdminAuth } from "@/lib/admin/AdminAuthContext";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Overview" },
  { to: "/admin/businesses", label: "Businesses" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { admin, signOut } = useAdminAuth();

  return (
    <div className="flex h-full flex-col justify-between p-4">
      <div>
        <div className="mb-6 px-2">
          <Logo size="sm" />
          <p className="mt-1 text-xs text-muted-foreground">Admin</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="px-2">
        <p className="mb-2 truncate text-xs text-muted-foreground">{admin?.email}</p>
        <Button variant="outline" size="sm" className="w-full" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function AdminShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:flex">
        <SidebarContent />
      </aside>

      <header className="flex items-center justify-between border-b bg-sidebar p-3 md:hidden">
        <Logo size="sm" />
        <Button variant="outline" size="icon" onClick={() => setMobileNavOpen(true)}>
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </header>
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
