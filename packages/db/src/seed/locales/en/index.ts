import type { LocaleData } from "../types";
import { englishCompanies } from "./companies";
import { englishContent } from "./content";
import { englishNames } from "./names";

export const englishLocale: LocaleData = {
  code: "en",
  name: "English",
  names: englishNames,
  companies: englishCompanies,
  content: englishContent,
};
