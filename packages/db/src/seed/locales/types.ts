/**
 * Type definitions for seed data locale system
 */

export interface PersonName {
  firstName: string;
  lastName: string;
  ethnicity?: string;
}

export interface LocaleNames {
  /** Names grouped by ethnicity (for locales like Indonesian) */
  ethnicities?: Record<string, PersonName[]>;
  /** Flat list of first names */
  firstNames: string[];
  /** Flat list of last names */
  lastNames: string[];
}

export interface LocaleCompanies {
  /** Company name templates */
  names: string[];
  /** Company suffixes (Inc, LLC, PT, CV) */
  suffixes: string[];
}

export interface LocaleContent {
  /** Post/article title templates */
  postTitles: string[];
  /** Category names */
  categories: string[];
  /** Tag names */
  tags: string[];
  /** Generic description templates */
  descriptions: string[];
  /** Department names */
  departments: string[];
  /** Job titles */
  jobTitles: string[];
  /** File name templates */
  fileNames: string[];
  /** Notification subjects */
  notificationSubjects: string[];
}

export interface LocaleData {
  /** ISO locale code (e.g., "en", "id") */
  code: string;
  /** Human-readable locale name */
  name: string;
  /** Person names data */
  names: LocaleNames;
  /** Company names data */
  companies: LocaleCompanies;
  /** Content strings */
  content: LocaleContent;
}
