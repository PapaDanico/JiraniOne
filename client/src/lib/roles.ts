import { Home, Briefcase, Shield, Store, type LucideIcon } from "lucide-react";
import type { UserRole } from "@shared/types";

// Single source of truth for per-role label, icon, palette, and one-line
// description. Every role-aware UI element reads from here so that a
// tester can glance at any page and know whether they're in the resident,
// admin, security, or vendor view.

export interface RolePresentation {
  label: string;
  description: string;
  Icon: LucideIcon;
  // Tailwind class used on small chips (badges in the TopBar).
  chip: string;
  // Tailwind classes used on the role banner that sits at the top of
  // every role-specific dashboard.
  banner: {
    container: string;
    iconBg: string;
    iconFg: string;
    text: string;
  };
}

export const ROLE_PRESENTATION: Record<UserRole, RolePresentation> = {
  resident: {
    label: "Resident",
    description:
      "Your household view — invite visitors, report issues, pay your levy.",
    Icon: Home,
    chip: "bg-brand-green/15 text-brand-green border-brand-green/30",
    banner: {
      container: "bg-brand-green-soft border-brand-green/20",
      iconBg: "bg-brand-green",
      iconFg: "text-brand-gold",
      text: "text-brand-green",
    },
  },
  admin: {
    label: "Admin",
    description:
      "Estate management view — every resident, ticket, payment, and announcement.",
    Icon: Briefcase,
    chip: "bg-brand-gold/15 text-brand-gold-dark border-brand-gold/40",
    banner: {
      container: "bg-brand-gold-soft border-brand-gold/30",
      iconBg: "bg-brand-gold-dark",
      iconFg: "text-white",
      text: "text-brand-gold-dark",
    },
  },
  security: {
    label: "Security",
    description:
      "Gate view — check visitors in and out, respond to emergency alerts.",
    Icon: Shield,
    chip: "bg-brand-red/15 text-brand-red border-brand-red/30",
    banner: {
      container: "bg-brand-red-soft border-brand-red/20",
      iconBg: "bg-brand-red",
      iconFg: "text-white",
      text: "text-brand-red",
    },
  },
  vendor: {
    label: "Vendor",
    description:
      "Service-provider view — your marketplace listings and bookings.",
    Icon: Store,
    chip: "bg-purple-100 text-purple-800 border-purple-300",
    banner: {
      container: "bg-purple-50 border-purple-200",
      iconBg: "bg-purple-600",
      iconFg: "text-white",
      text: "text-purple-800",
    },
  },
};
