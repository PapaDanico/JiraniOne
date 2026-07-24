// Structured dropdown options used across modules — the Tier-1 sweep that
// turned free-text fields into pickable facts (same rationale as
// shared/marketplace.ts: comparable data, filterability, less typing on a
// budget Android over 3G).

export const VISITOR_PURPOSES = [
  "Family visit",
  "Friend visit",
  "Delivery",
  "Contractor / Fundi",
  "Taxi / Boda pickup",
  "House viewing",
  "Other",
] as const;

export const LEAD_ROLES = [
  { value: "management_company", label: "Estate management company" },
  { value: "committee",          label: "Committee / association member" },
  { value: "developer",          label: "Property developer" },
  { value: "resident",           label: "Resident" },
  { value: "other",              label: "Other" },
] as const;

export function leadRoleLabel(value: string): string {
  return LEAD_ROLES.find((r) => r.value === value)?.label ?? value;
}

export const LEAD_UNIT_RANGES = [
  "1–20",
  "21–40",
  "41–100",
  "101–150",
  "151–300",
  "300+",
] as const;

export const CLASSIFIED_CONDITIONS = [
  { value: "new",      label: "Brand new" },
  { value: "like_new", label: "Like new" },
  { value: "used",     label: "Used" },
] as const;

export function conditionLabel(value: string): string {
  return CLASSIFIED_CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export const EVENT_TYPES = [
  { value: "agm",      label: "AGM / General meeting", emoji: "🏛️" },
  { value: "cleanup",  label: "Clean-up day",          emoji: "🧹" },
  { value: "sports",   label: "Sports & fitness",      emoji: "⚽" },
  { value: "kids",     label: "Kids' activity",        emoji: "🎈" },
  { value: "social",   label: "Social / celebration",  emoji: "🎉" },
  { value: "security", label: "Security meeting",      emoji: "🛡️" },
  { value: "other",    label: "Other",                 emoji: "📅" },
] as const;

export function eventTypeCfg(value: string | null | undefined) {
  return EVENT_TYPES.find((t) => t.value === value);
}

export const BOOKING_PURPOSES = [
  "Birthday party",
  "Family gathering",
  "Meeting",
  "Chama gathering",
  "Sports / fitness",
  "Kids' party",
  "Religious function",
  "Other",
] as const;

export const DOCUMENT_CATEGORIES = [
  { value: "rules",    label: "Rules & bylaws",   emoji: "📕" },
  { value: "minutes",  label: "Meeting minutes",  emoji: "📝" },
  { value: "notices",  label: "Notices",          emoji: "📢" },
  { value: "financial",label: "Financial",        emoji: "💰" },
  { value: "forms",    label: "Forms",            emoji: "📋" },
  { value: "other",    label: "Other",            emoji: "📄" },
] as const;

export function documentCategoryCfg(value: string | null | undefined) {
  return DOCUMENT_CATEGORIES.find((c) => c.value === value);
}
