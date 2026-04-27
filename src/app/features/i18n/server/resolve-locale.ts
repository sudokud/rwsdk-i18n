import { DEFAULT_LOCALE, type Direction, type Locale } from "../types";

const ARABIC_COUNTRIES = new Set([
  "DZ",
  "BH",
  "EG",
  "IQ",
  "JO",
  "KW",
  "LB",
  "LY",
  "MA",
  "OM",
  "PS",
  "QA",
  "SA",
  "SD",
  "SY",
  "TN",
  "AE",
  "YE",
]);

export function readLocaleCookie(
  cookieHeader: string | null,
): Locale | undefined {
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [rawName, rawValue] = cookie.split("=");
    if (!rawName || !rawValue) continue;

    const name = rawName.trim();
    const value = rawValue.trim();

    if (name === "locale" && (value === "en" || value === "ar")) {
      return value;
    }
  }

  return undefined;
}

export function resolveLocale(
  country: string | undefined,
  cookieLocale: Locale | undefined,
): Locale {
  if (cookieLocale) return cookieLocale;
  if (country && ARABIC_COUNTRIES.has(country)) return "ar";
  return DEFAULT_LOCALE;
}

export function getDirection(locale: Locale): Direction {
  return locale === "ar" ? "rtl" : "ltr";
}
