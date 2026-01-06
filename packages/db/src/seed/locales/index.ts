/**
 * Locale registry and helper functions for seed data
 *
 * Usage:
 *   const locale = getLocale(process.env.SEED_LOCALE);
 *   const name = getRandomName(locale);
 *   const company = getRandomCompany(locale);
 */

import { englishLocale } from "./en";
import { indonesianLocale } from "./id";
import type { LocaleData, PersonName } from "./types";

// ─────────────────────────────────────────────────────────────
// Locale Registry
// ─────────────────────────────────────────────────────────────

const locales: Record<string, LocaleData> = {
  en: englishLocale,
  id: indonesianLocale,
};

export const DEFAULT_LOCALE = "en";

/**
 * Get locale data by code
 * Falls back to default locale if not found
 */
export function getLocale(code?: string): LocaleData {
  const locale = locales[code ?? DEFAULT_LOCALE];
  if (locale) {
    return locale;
  }
  // Default locale is guaranteed to exist
  return locales[DEFAULT_LOCALE] as LocaleData;
}

/**
 * Get list of available locale codes
 */
export function getAvailableLocales(): string[] {
  return Object.keys(locales);
}

// ─────────────────────────────────────────────────────────────
// Name Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get a random name from the locale
 * Optionally specify ethnicity for locales that support it
 */
export function getRandomName(
  locale: LocaleData,
  ethnicity?: string
): PersonName {
  // If ethnicity is specified and the locale has ethnicity data
  if (ethnicity && locale.names.ethnicities?.[ethnicity]) {
    const pool = locale.names.ethnicities[ethnicity];
    const name = pool[Math.floor(Math.random() * pool.length)];
    if (name) {
      return name;
    }
  }

  // Fall back to random first/last name combination
  const firstName =
    locale.names.firstNames[
      Math.floor(Math.random() * locale.names.firstNames.length)
    ] ?? "John";
  const lastName =
    locale.names.lastNames[
      Math.floor(Math.random() * locale.names.lastNames.length)
    ] ?? "Doe";

  return { firstName, lastName };
}

/**
 * Get a random name with realistic distribution for Indonesian locale
 * Uses weighted distribution based on actual population demographics
 */
export function getRandomNameWithDistribution(locale: LocaleData): PersonName {
  if (locale.code !== "id" || !locale.names.ethnicities) {
    return getRandomName(locale);
  }

  // Weighted distribution roughly matching Indonesian demographics
  // Javanese ~40%, Sundanese ~15%, Chinese ~3%, Batak ~3%, others ~39%
  const weights: Record<string, number> = {
    javanese: 40,
    sundanese: 15,
    chinese: 3,
    batak: 3,
    minang: 3,
    betawi: 3,
    malay: 3,
    bugis: 3,
  };

  // Calculate total weight
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const random = Math.random() * totalWeight;

  let cumulative = 0;
  for (const [ethnicity, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (random <= cumulative) {
      return getRandomName(locale, ethnicity);
    }
  }

  // Fallback
  return getRandomName(locale);
}

/**
 * Get multiple unique names
 */
export function getRandomNames(
  locale: LocaleData,
  count: number,
  options?: {
    ethnicity?: string;
    useDistribution?: boolean;
  }
): PersonName[] {
  const names: PersonName[] = [];
  const seen = new Set<string>();

  while (names.length < count) {
    const name = options?.useDistribution
      ? getRandomNameWithDistribution(locale)
      : getRandomName(locale, options?.ethnicity);

    const key = `${name.firstName}-${name.lastName}`;
    if (!seen.has(key)) {
      seen.add(key);
      names.push(name);
    }

    // Prevent infinite loop if not enough unique names
    if (
      seen.size >=
      locale.names.firstNames.length * locale.names.lastNames.length
    ) {
      break;
    }
  }

  return names;
}

// ─────────────────────────────────────────────────────────────
// Company Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get a random company name with suffix
 */
export function getRandomCompany(locale: LocaleData): string {
  const name =
    locale.companies.names[
      Math.floor(Math.random() * locale.companies.names.length)
    ];
  const suffix =
    locale.companies.suffixes[
      Math.floor(Math.random() * locale.companies.suffixes.length)
    ];

  // Indonesian format: PT Name Suffix or CV Name
  if (locale.code === "id") {
    const prefix = Math.random() > 0.3 ? "PT" : "CV";
    return `${prefix} ${name} ${suffix}`;
  }

  return `${name} ${suffix}`;
}

// ─────────────────────────────────────────────────────────────
// Content Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get a random item from a content array
 */
export function getRandomContent<K extends keyof LocaleData["content"]>(
  locale: LocaleData,
  key: K
): string {
  const items = locale.content[key];
  return items[Math.floor(Math.random() * items.length)] ?? "";
}

/**
 * Get multiple random items from a content array
 */
export function getRandomContents<K extends keyof LocaleData["content"]>(
  locale: LocaleData,
  key: K,
  count: number
): string[] {
  const items = locale.content[key];
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, items.length));
}

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

export { englishLocale } from "./en";
export { indonesianLocale } from "./id";
export type {
  LocaleCompanies,
  LocaleContent,
  LocaleData,
  LocaleNames,
  PersonName,
} from "./types";
