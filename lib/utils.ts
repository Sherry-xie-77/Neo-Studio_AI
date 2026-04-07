import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function currency(cents: number, code = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
  }).format(cents / 100);
}

export function absoluteUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function slugDate(date: string) {
  return date.replaceAll("-", "");
}
