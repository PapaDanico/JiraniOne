import { Link, useLocation } from "wouter";
import {
  Home, Users, Wrench, Megaphone, ShieldAlert, LogOut, Menu, X,
  Store, Vote, CreditCard, UserPen, Eye, EyeOff, ChevronDown, MapPin,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEstate } from "@/hooks/useEstate";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { RoleBadge } from "@/components/shared/role-badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import type { UserRole } from "@shared/types";
import { BRAND_NAME, SUPPORT_EMAIL } from "@shared/brand";

interface EstateLite { id: string; name: string; location: string }

// ─── Nav model ────────────────────────────────────────────────────────────────
// Single source of truth, keyed by role. We render up to 5 items in the
// bottom-nav (mobile) and up to 6 inline in the TopBar (desktop). Anything
// else lives in the More menu drawer.

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  // shorter label for the bottom-nav (which has ~60px per cell on
  // a 375px viewport).
  short?: string;
}

const PRIMARY_NAV: Record<UserRole, NavItem[]> = {
  resident: [
    { href: "/dashboard/resident", label: "Home",        icon: <Home className="h-5 w-5" /> },
    { href: "/visitors",           label: "Visitors",    icon: <Users className="h-5 w-5" /> },
    { href: "/maintenance",        label: "Issues",      icon: <Wrench className="h-5 w-5" /> },
    { href: "/payments",           label: "Payments",    icon: <CreditCard className="h-5 w-5" /> },
    { href: "/emergency",          label: "SOS",         icon: <ShieldAlert className="h-5 w-5" /> },
  ],
  admin: [
    { href: "/dashboard/admin",    label: "Home",        icon: <Home className="h-5 w-5" /> },
    { href: "/visitors",           label: "Visitors",    icon: <Users className="h-5 w-5" /> },
    { href: "/maintenance",        label: "Tickets",     icon: <Wrench className="h-5 w-5" /> },
    { href: "/announcements",      label: "Notices",     icon: <Megaphone className="h-5 w-5" /> },
    { href: "/governance",         label: "Polls",       icon: <Vote className="h-5 w-5" /> },
  ],
  security: [
    { href: "/dashboard/security", label: "Gate",        icon: <ShieldAlert className="h-5 w-5" /> },
    { href: "/visitors",           label: "Visitors",    icon: <Users className="h-5 w-5" /> },
    { href: "/emergency",          label: "Alerts",      icon: <ShieldAlert className="h-5 w-5" /> },
    { href: "/announcements",      label: "Notices",     icon: <Megaphone className="h-5 w-5" /> },
  ],
  vendor: [
    { href: "/dashboard/vendor",   label: "Profile",     icon: <Store className="h-5 w-5" /> },
    { href: "/marketplace",        label: "Marketplace", icon: <Store className="h-5 w-5" /> },
  ],
};

const MORE_LINKS: Array<{ href: string; label: string; roles: UserRole[] }> = [
  { href: "/announcements", label: "Announcements", roles: ["resident", "admin", "security"] },
  { href: "/payments",      label: "Payments",      roles: ["resident", "admin"] },
  { href: "/events",        label: "Events",        roles: ["resident", "admin", "security"] },
  { href: "/bookings",      label: "Bookings",      roles: ["resident", "admin"] },
  { href: "/marketplace",   label: "Marketplace",   roles: ["resident", "admin", "vendor"] },
  { href: "/governance",    label: "Governance",    roles: ["resident", "admin"] },
  { href: "/harambee",      label: "Harambee",      roles: ["resident", "admin"] },
  { href: "/carpool",       label: "Carpool",       roles: ["resident", "admin"] },
  { href: "/chama",         label: "Chama",         roles: ["resident", "admin"] },
  { href: "/parcels",       label: "Parcels",       roles: ["resident", "admin", "security"] },
  { href: "/classifieds",   label: "Noticeboard",   roles: ["resident", "admin"] },
  { href: "/emergency",     label: "Emergency",     roles: ["resident", "admin", "security"] },
  { href: "/notifications", label: "Notifications", roles: ["resident", "admin", "security", "vendor"] },
  { href: "/admin/users",   label: "Residents",     roles: ["admin"] },
  { href: "/admin/settings",label: "Estate Settings", roles: ["admin"] },
  { href: "/documents",     label: "Documents",     roles: ["resident", "admin", "security", "vendor"] },
  { href: "/faq",           label: "Help & FAQ",    roles: ["resident", "admin", "security", "vendor"] },
];

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({
  open, onClose, initialTab = "name",
}: { open: boolean; onClose: () => void; initialTab?: "name" | "password" | "estate" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const showEstateTab = !user?.estateId;
  const [tab, setTab] = useState<"name" | "password" | "estate">(initialTab);
  // `open` toggles without remounting this component, so the initialTab prop
  // only takes effect on first mount without this — re-sync on every open.
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);
  const [name, setName] = useState(user?.name ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [estateId, setEstateId] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: estates } = useQuery({
    queryKey: ["estates-public"],
    queryFn: () => api.get<EstateLite[]>("/api/auth/estates").then((r) => r.data),
    enabled: open && showEstateTab,
  });

  const nameMutation = useMutation({
    mutationFn: () => api.patch("/api/users/me/profile", { name: name.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      setSuccess("Name updated successfully.");
      setError(null);
    },
    onError: (e: unknown) => { setError(e instanceof Error ? e.message : "Update failed"); setSuccess(null); },
  });

  const pwMutation = useMutation({
    mutationFn: () => api.post("/api/users/me/password", { currentPassword: currentPw, newPassword: newPw }),
    onSuccess: () => {
      setSuccess("Password changed successfully.");
      setError(null);
      setCurrentPw(""); setNewPw("");
    },
    onError: (e: unknown) => { setError(e instanceof Error ? e.message : "Password change failed"); setSuccess(null); },
  });

  const estateMutation = useMutation({
    mutationFn: () => api.patch("/api/users/me/estate", { estateId, unitNumber: unitNumber.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: ["estate"] });
      setSuccess("Estate confirmed.");
      setError(null);
    },
    onError: (e: unknown) => { setError(e instanceof Error ? e.message : "Could not confirm estate"); setSuccess(null); },
  });

  const handleClose = () => {
    setError(null); setSuccess(null);
    setCurrentPw(""); setNewPw("");
    setName(user?.name ?? "");
    setEstateId(""); setUnitNumber("");
    setTab(initialTab);
    onClose();
  };

  const tabs = (["name", "password", ...(showEstateTab ? ["estate" as const] : [])] as const);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center">
              <UserPen className="h-5 w-5 text-white" />
            </div>
            <DialogTitle>Edit Profile</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex border-b border-tribal-border px-6">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setSuccess(null); }}
              className={cn(
                "px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors capitalize",
                tab === t
                  ? "border-brand-green text-brand-green"
                  : "border-transparent text-tribal-earth hover:text-tribal-charcoal",
              )}
            >
              {t === "name" ? "Display Name" : t === "password" ? "Change Password" : "Estate"}
            </button>
          ))}
        </div>

        <div className="px-6 pb-2 space-y-4">
          {tab === "name" && (
            <div>
              <Label className="text-tribal-charcoal font-semibold">Display Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
            </div>
          )}
          {tab === "password" && (
            <>
              <div>
                <Label className="text-tribal-charcoal font-semibold">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tribal-earth"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-tribal-charcoal font-semibold">New Password</Label>
                <Input
                  type={showPw ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                />
              </div>
            </>
          )}
          {tab === "estate" && (
            <>
              <p className="text-sm text-tribal-earth">
                Confirm the estate you live in. Your admin can change this later if needed.
              </p>
              <div>
                <Label className="text-tribal-charcoal font-semibold">Estate</Label>
                <Select value={estateId} onValueChange={setEstateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your estate" />
                  </SelectTrigger>
                  <SelectContent>
                    {estates?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} — {e.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-tribal-charcoal font-semibold">Unit / House number</Label>
                <Input
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="A14"
                />
              </div>
            </>
          )}

          {error   && <p className="text-sm text-brand-red bg-brand-red/10 rounded-xl px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-brand-green bg-brand-green/10 rounded-xl px-3 py-2">{success}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => {
              setError(null); setSuccess(null);
              if (tab === "name") nameMutation.mutate();
              else if (tab === "password") pwMutation.mutate();
              else estateMutation.mutate();
            }}
            disabled={tab === "estate" && !estateId}
            loading={nameMutation.isPending || pwMutation.isPending || estateMutation.isPending}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
// Desktop: logo + inline nav + role chip + menu trigger.
// Mobile : logo + role chip + menu trigger only (full nav lives in BottomNav).
//
// The "More" drawer hosts everything that doesn't fit primary nav. We
// dropped the previous big-grid drawer because it duplicated the bottom-nav
// items on mobile and the inline-nav items on desktop.

export function TopBar({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  const { data: estate } = useEstate();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<"name" | "password" | "estate">("name");

  if (!user) return null;

  const primary = PRIMARY_NAV[user.role as UserRole] ?? [];
  const moreLinks = MORE_LINKS.filter((l) => l.roles.includes(user.role as UserRole));

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-brand-green text-white">
        <div className="flex items-center justify-between px-4 h-14 max-w-6xl mx-auto gap-3">
          {/* Brand */}
          <Link href={`/dashboard/${user.role}`} className="flex items-center gap-2.5 shrink-0">
            <img
              src="/brand/logo-mark.webp"
              alt={BRAND_NAME}
              className="h-8 w-8 object-contain"
              onError={(e) => {
                const t = e.currentTarget;
                t.style.display = "none";
                const fb = t.nextElementSibling as HTMLElement;
                if (fb) fb.style.removeProperty("display");
              }}
            />
            <div
              className="w-7 h-7 rounded-lg bg-brand-gold items-center justify-center"
              style={{ display: "none" }}
            >
              <span className="text-tribal-charcoal font-bold text-xs">JH</span>
            </div>
            <span className="font-bold text-lg tracking-tight font-display">{BRAND_NAME}</span>
            {title && (
              <>
                <span className="text-white/30 mx-0.5 hidden sm:inline">/</span>
                <span className="text-sm font-medium text-white/75 hidden sm:inline">{title}</span>
              </>
            )}
          </Link>

          {/* Desktop inline nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {primary.map((item) => {
              const active = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2 shrink-0">
            {estate && (
              <span className="hidden md:inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90">
                <MapPin className="h-3 w-3" />
                {estate.name}
              </span>
            )}
            <RoleBadge
              role={user.role as UserRole}
              className="bg-white/15 text-white border-white/30 hidden sm:inline-flex"
            />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="maasai-stripe" />

      <EditProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        initialTab={profileInitialTab}
      />

      {/* More drawer */}
      {menuOpen && (
        <div className="bg-brand-green-dark text-white border-b border-brand-gold/20">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center shrink-0">
                <span className="text-brand-gold font-bold">{user.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{user.name}</div>
                <div className="text-xs text-white/50">{user.phone}</div>
                {estate && (
                  <div className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {estate.name}
                  </div>
                )}
              </div>
              <RoleBadge
                role={user.role as UserRole}
                className="bg-white/15 text-white border-white/30 sm:hidden"
              />
              <button
                onClick={() => { setMenuOpen(false); setProfileInitialTab("name"); setProfileOpen(true); }}
                className="flex items-center gap-1.5 text-xs text-brand-gold bg-brand-gold/15 hover:bg-brand-gold/25 rounded-lg px-2.5 py-1.5 transition-colors shrink-0"
              >
                <UserPen className="h-3.5 w-3.5" /> Edit
              </button>
            </div>

            {!user.estateId && (
              <button
                onClick={() => { setMenuOpen(false); setProfileInitialTab("estate"); setProfileOpen(true); }}
                className="mb-3 w-full flex items-center gap-2 rounded-xl border border-brand-gold/40 bg-brand-gold/10 px-3 py-2.5 text-left transition-colors hover:bg-brand-gold/15"
              >
                <MapPin className="h-4 w-4 text-brand-gold shrink-0" />
                <span className="text-xs font-semibold text-white">
                  No estate set yet — tap to confirm which estate you live in
                </span>
              </button>
            )}

            {moreLinks.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 mb-2">
                  More
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1">
                  {moreLinks.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      onClick={() => setMenuOpen(false)}
                      className="text-sm text-white/80 hover:text-white py-1.5 transition-colors"
                    >
                      {i.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-white/10 pt-3">
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex items-center gap-2 text-sm text-white/70 hover:text-white py-1.5 w-full transition-colors min-h-0"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>

            <div className="border-t border-white/10 mt-3 pt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              <Link
                href="/privacy"
                onClick={() => setMenuOpen(false)}
                className="text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                onClick={() => setMenuOpen(false)}
                className="text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                Terms of Service
              </Link>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                Support
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── BottomNav ────────────────────────────────────────────────────────────────
// Mobile only — hidden ≥ md. Five primary items per role, derived from the
// same PRIMARY_NAV registry as the TopBar inline nav.

export function BottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;
  const items = PRIMARY_NAV[user.role as UserRole] ?? [];
  if (items.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-tribal-cream border-t border-tribal-border safe-bottom md:hidden">
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const active = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 flex-1 min-h-[56px] text-xs gap-1 transition-colors",
                active ? "text-brand-green font-semibold" : "text-tribal-earth hover:text-tribal-charcoal",
              )}
            >
              <span className={cn("p-1 rounded-lg transition-colors", active ? "bg-brand-green/10" : "")}>
                {item.icon}
              </span>
              <span>{item.short ?? item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
