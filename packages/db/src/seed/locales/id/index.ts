import type { LocaleData } from "../types";
import { indonesianCompanies } from "./companies";
import { indonesianContent } from "./content";
import { indonesianNames } from "./names";

export const indonesianLocale: LocaleData = {
  code: "id",
  name: "Indonesian",
  names: indonesianNames,
  companies: indonesianCompanies,
  content: indonesianContent,
};
