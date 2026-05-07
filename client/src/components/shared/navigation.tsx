import { Link, useLocation } from "wouter";
import {
  Home, Users, Wrench, Megaphone, ShieldAlert,
  LogOut, Menu, X, Store, CalendarDays, Vote, BookOpen,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

// Each role sees exactly 5 items in the bottom nav
const navItems: NavItem[] = [
  // Resident: Home, Visitors, Maintenance, Payments, Emergency
  { href: "/dashboard/resident", label: "Home", icon: <Home className="h-5 w-5" />, roles: ["resident"] },
  { href: "/visitors", label: "Visitors", icon: <Users className="h-5 w-5" />, roles: ["resident"] },
  { href: "/maintenance", label: "Fix", icon: <Wrench className="h-5 w-5" />, roles: ["resident"] },
  { href: "/payments", label: "Payments", icon: <CreditCard className="h-5 w-5" />, roles: ["resident"] },
  { href: "/emergency", label: "SOS", icon: <ShieldAlert className="h-5 w-5" />, roles: ["resident"] },
  // Admin: Home, Visitors, Maintenance, Notices, More (governance)
  { href: "/dashboard/admin", label: "Home", icon: <Home className="h-5 w-5" />, roles: ["admin"] },
  { href: "/visitors", label: "Visitors", icon: <Users className="h-5 w-5" />, roles: ["admin"] },
  { href: "/maintenance", label: "Tickets", icon: <Wrench className="h-5 w-5" />, roles: ["admin"] },
  { href: "/announcements", label: "Notices", icon: <Megaphone className="h-5 w-5" />, roles: ["admin"] },
  { href: "/governance", label: "Govern", icon: <Vote className="h-5 w-5" />, roles: ["admin"] },
  // Security: Gate, Visitors, Emergency, Announcements
  { href: "/dashboard/security", label: "Gate", icon: <ShieldAlert className="h-5 w-5" />, roles: ["security"] },
  { href: "/visitors", label: "Visitors", icon: <Users className="h-5 w-5" />, roles: ["security"] },
  { href: "/emergency", label: "Alerts", icon: <ShieldAlert className="h-5 w-5" />, roles: ["security"] },
  { href: "/announcements", label: "Notices", icon: <Megaphone className="h-5 w-5" />, roles: ["security"] },
  // Vendor: Services, Marketplace
  { href: "/dashboard/vendor", label: "My Profile", icon: <Store className="h-5 w-5" />, roles: ["vendor"] },
  { href: "/marketplace", label: "Directory", icon: <Store className="h-5 w-5" />, roles: ["vendor"] },
];

export function BottomNav() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const items = navItems.filter((i) => i.roles.includes(user.role)).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-bottom">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const active = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 flex-1 min-h-[56px] text-xs gap-1 transition-colors",
                active
                  ? "text-[#1A5C38] font-medium"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    resident: "Resident",
    security: "Security",
    vendor: "Vendor",
  };

  return (
    <header className="sticky top-0 z-40 bg-[#1A5C38] text-white">
      <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="font-['Plus_Jakarta_Sans'] font-bold text-lg">JiraniHub</span>
          {title && (
            <>
              <span className="text-white/40">/</span>
              <span className="text-sm font-medium text-white/80">{title}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
            {roleLabel[user.role]}
          </span>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="bg-[#0F3C24] border-t border-white/10 px-4 py-3">
          <div className="text-sm text-white/70 mb-0.5">{user.name}</div>
          <div className="text-xs text-white/50 mb-3">{user.phone}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4">
            {[
              { href: "/announcements", label: "Notices", roles: ["resident","admin","security"] },
              { href: "/payments", label: "Payments", roles: ["resident","admin"] },
              { href: "/events", label: "Events", roles: ["resident","admin","security"] },
              { href: "/bookings", label: "Bookings", roles: ["resident","admin"] },
              { href: "/marketplace", label: "Marketplace", roles: ["resident","admin","vendor"] },
              { href: "/governance", label: "Governance", roles: ["resident","admin"] },
              { href: "/emergency", label: "Emergency", roles: ["resident","admin","security"] },
            ]
              .filter((i) => i.roles.includes(user.role))
              .map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm text-white/75 hover:text-white py-1"
                >{i.label}</Link>
              ))
            }
          </div>
          <button
            onClick={() => { setMenuOpen(false); logout(); }}
            className="flex items-center gap-2 text-sm text-white/80 hover:text-white py-2 border-t border-white/10 w-full pt-3"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
