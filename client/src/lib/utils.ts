import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | Date, fmt = "d MMM yyyy") {
  return format(new Date(date), fmt);
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "d MMM yyyy, HH:mm");
}

// Kenyan phone normalizer (client-side display)
export function displayPhone(phone: string) {
  if (phone.startsWith("+254")) {
    return `0${phone.slice(4)}`;
  }
  return phone;
}
