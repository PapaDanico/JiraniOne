import { Link, useLocation } from "wouter";
import {
  Home, Users, Wrench, Megaphone, ShieldAlert,
  LogOut, Menu, X, Store, CalendarDays, Vote, BookOpen,
  CreditCard, Bell,
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

const navItems: NavItem[] = [
  { href: "/dashboard/resident", label: "Home",        icon: <Home className="h-5 w-5" />,       roles: ["resident"] },
  { href: "/visitors",           label: "Visitors",    icon: <Users className="h-5 w-5" />,       roles: ["resident"] },
  { href: "/maintenance",        label: "Maintenance", icon: <Wrench className="h-5 w-5" />,      roles: ["resident"] },
  { href: "/payments",           label: "Payments",    icon: <CreditCard className="h-5 w-5" />,  roles: ["resident"] },
  { href: "/emergency",          label: "SOS",         icon: <ShieldAlert className="h-5 w-5" />, roles: ["resident"] },

  { href: "/dashboard/admin",    label: "Home",        icon: <Home className="h-5 w-5" />,        roles: ["admin"] },
  { href: "/visitors",           label: "Visitors",    icon: <Users className="h-5 w-5" />,       roles: ["admin"] },
  { href: "/maintenance",        label: "Tickets",     icon: <Wrench className="h-5 w-5" />,      roles: ["admin"] },
  { href: "/announcements",      label: "Notices",     icon: <Megaphone className="h-5 w-5" />,   roles: ["admin"] },
  { href: "/governance",         label: "Polls",       icon: <Vote className="h-5 w-5" />,        roles: ["admin"] },

  { href: "/dashboard/security", label: "Gate",        icon: <ShieldAlert className="h-5 w-5" />, roles: ["security"] },
  { href: "/visitors",           label: "Visitors",    icon: <Users className="h-5 w-5" />,       roles: ["security"] },
  { href: "/emergency",          label: "Alerts",      icon: <ShieldAlert className="h-5 w-5" />, roles: ["security"] },
  { href: "/announcements",      label: "Notices",     icon: <Megaphone className="h-5 w-5" />,   roles: ["security"] },

  { href: "/dashboard/vendor",   label: "Profile",     icon: <Store className="h-5 w-5" />,       roles: ["vendor"] },
  { href: "/marketplace",        label: "Marketplace", icon: <Store className="h-5 w-5" />,       roles: ["vendor"] },
];

export function BottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const items = navItems.filter((i) => i.roles.includes(user.role)).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#F5F1E8] border-t border-[#D4C9A8] safe-bottom">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const active = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 flex-1 min-h-[56px] text-xs gap-1 transition-colors",
                active
                  ? "text-[#1B5E20] font-semibold"
                  : "text-[#6B5D45] hover:text-[#212121]",
              )}
            >
              <span className={cn(
                "p-1 rounded-lg transition-colors",
                active ? "bg-[#1B5E20]/10" : ""
              )}>
                {item.icon}
              </span>
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
    admin:    "Admin",
    resident: "Resident",
    security: "Security",
    vendor:   "Vendor",
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-[#1B5E20] text-white">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            {/* Logo */}
            <img
              src="/logo.svg"
              alt="JiraniHub"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                const t = e.currentTarget;
                t.style.display = "none";
                const fb = t.nextElementSibling as HTMLElement;
                if (fb) fb.style.removeProperty("display");
              }}
            />
            <div
              className="w-7 h-7 rounded-lg bg-[#D4A017] items-center justify-center"
              style={{ display: "none" }}
            >
              <span className="text-[#212121] font-black text-xs">JH</span>
            </div>
            <span className="font-bold text-lg tracking-tight">JiraniHub</span>
            {title && (
              <>
                <span className="text-white/30 mx-0.5">/</span>
                <span className="text-sm font-medium text-white/75">{title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-[#D4A017]/20 text-[#D4A017] rounded-full px-2.5 py-0.5 font-semibold">
              {roleLabel[user.role]}
            </span>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Maasai stripe */}
      <div className="maasai-stripe" />

      {/* Drawer */}
      {menuOpen && (
        <div className="bg-[#0D3B11] text-white border-b border-[#D4A017]/20">
          <div className="max-w-2xl mx-auto px-4 py-4">
            {/* User info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#D4A017]/20 flex items-center justify-center">
                <span className="text-[#D4A017] font-bold">{user.name.charAt(0)}</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-xs text-white/50">{user.phone}</div>
              </div>
            </div>
            {/* Menu links */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 mb-4">
              {[
                { href: "/announcements", label: "Announcements", roles: ["resident","admin","security"] },
                { href: "/payments",      label: "Payments",      roles: ["resident","admin"] },
                { href: "/events",        label: "Events",        roles: ["resident","admin","security"] },
                { href: "/bookings",      label: "Bookings",      roles: ["resident","admin"] },
                { href: "/marketplace",   label: "Marketplace",   roles: ["resident","admin","vendor"] },
                { href: "/governance",    label: "Governance",    roles: ["resident","admin"] },
                { href: "/emergency",     label: "Emergency",     roles: ["resident","admin","security"] },
                { href: "/notifications", label: "Notifications", roles: ["resident","admin","security","vendor"] },
                { href: "/users",         label: "Residents",     roles: ["admin"] },
              ]
                .filter((i) => i.roles.includes(user.role))
                .map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-sm text-white/70 hover:text-white py-1.5 transition-colors"
                  >
                    {i.label}
                  </Link>
                ))
              }
            </div>
            <div className="border-t border-white/10 pt-3">
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex items-center gap-2 text-sm text-white/70 hover:text-white py-1.5 w-full transition-colors min-h-0"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
