import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/app", label: "Checkout", roles: ["OWNER", "MANAGER", "STAFF"] },
  { to: "/app/products", label: "Products", roles: ["OWNER", "MANAGER", "STAFF"] },
  { to: "/app/low-stock", label: "Low Stock", roles: ["OWNER", "MANAGER"] },
  { to: "/app/customers", label: "Customers", roles: ["OWNER", "MANAGER", "STAFF"] },
  { to: "/app/ai-assistant", label: "AI Assistant", roles: ["OWNER", "MANAGER"] },
  { to: "/app/orders", label: "Orders", roles: ["OWNER", "MANAGER", "STAFF"] },
  { to: "/app/audit-log", label: "Audit Log", roles: ["OWNER", "MANAGER"] },
  { to: "/app/reports", label: "Reports", roles: ["OWNER", "MANAGER"] },
  { to: "/app/staff", label: "Staff", roles: ["OWNER", "MANAGER"] },
  { to: "/app/store-qr", label: "Store QR", roles: ["OWNER", "MANAGER"] },
  { to: "/app/marketplace-settings", label: "Marketplace", roles: ["OWNER", "MANAGER"] },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { role, user, signOut } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => role && item.roles.includes(role));

  return (
    <div className="flex h-full flex-col justify-between p-4">
      <div>
        <div className="mb-6 px-2">
          <Logo size="sm" />
          <p className="mt-1 text-xs text-muted-foreground">{role}</p>
        </div>
        <nav className="flex flex-col gap-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
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
        <p className="mb-2 truncate text-xs text-muted-foreground">{user?.email}</p>
        <Button variant="outline" size="sm" className="w-full" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
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
