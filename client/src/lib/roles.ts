import { Home, Briefcase, Shield, Store, type LucideIcon } from "lucide-react";
import type { UserRole } from "@shared/types";

// Single source of truth for role styling. Each entry yields a label,
// a Lucide icon, and a two-tone Tailwind palette that we apply to chips
// and banners across the app. Designed so that a tester can glance at any
// page and know whether they're in the resident, admin, security, or
// vendor view without reading the URL.

export interface RolePresentation {
  label: string;
  shortLabel: string;
  description: string;
  Icon: LucideIcon;
  // Tailwind classes used by RoleBadge.
  chipBg: string;
  chipFg: string;
  chipBorder: string;
  // Used by RoleBanner.
  bannerBg: string;
  bannerBorder: string;
  bannerText: string;
  bannerIconBg: string;
  bannerIconFg: string;
}

export const ROLE_PRESENTATION: Record<UserRole, RolePresentation> = {
  resident: {
    label: "Resident",
    shortLabel: "Resident",
    description:
      "Your household view — invite visitors, report issues, pay your levy.",
    Icon: Home,
    chipBg: "bg-[#1B5E20]/15",
    chipFg: "text-[#1B5E20]",
    chipBorder: "border-[#1B5E20]/30",
    bannerBg: "bg-[#1B5E20]/5",
    bannerBorder: "border-[#1B5E20]/20",
    bannerText: "text-[#1B5E20]",
    bannerIconBg: "bg-[#1B5E20]",
    bannerIconFg: "text-[#D4A017]",
  },
  admin: {
    label: "Admin",
    shortLabel: "Admin",
    description:
      "Estate management view — every resident, ticket, payment, and announcement.",
    Icon: Briefcase,
    chipBg: "bg-[#D4A017]/15",
    chipFg: "text-[#9A6E00]",
    chipBorder: "border-[#D4A017]/40",
    bannerBg: "bg-[#D4A017]/10",
    bannerBorder: "border-[#D4A017]/30",
    bannerText: "text-[#9A6E00]",
    bannerIconBg: "bg-[#9A6E00]",
    bannerIconFg: "text-white",
  },
  security: {
    label: "Security",
    shortLabel: "Security",
    description:
      "Gate view — check visitors in and out, respond to emergency alerts.",
    Icon: Shield,
    chipBg: "bg-[#B71C1C]/15",
    chipFg: "text-[#B71C1C]",
    chipBorder: "border-[#B71C1C]/30",
    bannerBg: "bg-[#B71C1C]/5",
    bannerBorder: "border-[#B71C1C]/20",
    bannerText: "text-[#B71C1C]",
    bannerIconBg: "bg-[#B71C1C]",
    bannerIconFg: "text-white",
  },
  vendor: {
    label: "Vendor",
    shortLabel: "Vendor",
    description:
      "Service-provider view — your marketplace listings and bookings.",
    Icon: Store,
    chipBg: "bg-purple-100",
    chipFg: "text-purple-800",
    chipBorder: "border-purple-300",
    bannerBg: "bg-purple-50",
    bannerBorder: "border-purple-200",
    bannerText: "text-purple-800",
    bannerIconBg: "bg-purple-600",
    bannerIconFg: "text-white",
  },
};
