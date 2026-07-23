// Marketplace structured options — single source of truth for the
// provider registration dropdowns (client form), validation (shared
// validators), and display (provider cards). Structured beats free text
// here for three reasons: comparable listings (residents can weigh two
// plumbers), filterability later, and far less typing on a budget Android
// keyboard over 3G.

export const PROVIDER_CATEGORIES = [
  { value: "Plumber",        emoji: "🔧", label: "Plumber" },
  { value: "Electrician",    emoji: "⚡", label: "Electrician" },
  { value: "Cleaner",        emoji: "🧹", label: "Cleaner" },
  { value: "Painter",        emoji: "🎨", label: "Painter" },
  { value: "Carpenter",      emoji: "🪚", label: "Carpenter" },
  { value: "Security Guard", emoji: "🛡️", label: "Security Guard" },
  { value: "Gardener",       emoji: "🌿", label: "Gardener" },
  { value: "Handyman",       emoji: "🛠️", label: "Handyman" },
  { value: "Driver",         emoji: "🚗", label: "Driver" },
  { value: "Tutor",          emoji: "📚", label: "Tutor" },
  { value: "Other",          emoji: "📋", label: "Other" },
] as const;

// Rate bands, not raw numbers — Kenyan fundis overwhelmingly quote per
// job after seeing it; forcing an exact hourly figure produces made-up
// numbers. Bands still let a resident compare price levels at a glance.
export const RATE_CARDS = [
  "Fixed quote per job",
  "KES 300–500 /hr",
  "KES 500–1,000 /hr",
  "KES 1,000–2,000 /hr",
  "KES 2,000+ /hr",
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "everyday", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends only" },
  { value: "on_call",  label: "On call (incl. emergencies)" },
] as const;

export type Availability = (typeof AVAILABILITY_OPTIONS)[number]["value"];

export const EXPERIENCE_OPTIONS = [
  { value: 1,  label: "1 year" },
  { value: 2,  label: "2 years" },
  { value: 3,  label: "3+ years" },
  { value: 5,  label: "5+ years" },
  { value: 10, label: "10+ years" },
] as const;

export function experienceLabel(years: number): string {
  const opt = [...EXPERIENCE_OPTIONS].reverse().find((o) => years >= o.value);
  return opt ? opt.label : `${years} yr`;
}

export function availabilityLabel(value: string): string {
  return AVAILABILITY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

// Per-category specialisation menus, Kenyan-market flavoured. "Other"
// deliberately has none — the description field covers the long tail.
export const SPECIALIZATIONS: Record<string, readonly string[]> = {
  Plumber:          ["Leak repairs", "Water heaters", "Drainage & sewer", "Tanks & pumps", "New installations"],
  Electrician:      ["Wiring & rewiring", "Solar & backup power", "Appliance repair", "Security lighting", "Token meter issues"],
  Cleaner:          ["House cleaning", "Laundry & ironing", "Sofa & carpet", "Move-in / move-out", "Water tank cleaning"],
  Painter:          ["Interior", "Exterior", "Waterproofing", "Gypsum & finishes"],
  Carpenter:        ["Furniture repair", "Fitted wardrobes", "Doors & locks", "Shelving & cabinets"],
  "Security Guard": ["Day shift", "Night shift", "Events", "CCTV monitoring"],
  Gardener:         ["Lawn care", "Landscaping", "Tree pruning", "Compound maintenance"],
  Handyman:         ["Mounting & assembly", "Minor repairs", "Gates & fences", "Tiling"],
  Driver:           ["School runs", "Airport transfers", "Errands & deliveries", "Personal driver"],
  Tutor:            ["Primary (CBC)", "High school", "Languages", "Music & arts", "Computer skills"],
  Other:            [],
};

export const MAX_SPECIALIZATIONS = 5;
