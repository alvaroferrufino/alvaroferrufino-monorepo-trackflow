import countries from "i18n-iso-countries";
import spanish from "i18n-iso-countries/langs/es.json";

countries.registerLocale(spanish);

export const COUNTRY_LABELS: Record<string, string> = {
  ...countries.getNames("es", { select: "official" }),
  XK: "Kosovo",
};

export const COUNTRY_OPTIONS = Object.entries(COUNTRY_LABELS).sort((first, second) => first[1].localeCompare(second[1], "es"));