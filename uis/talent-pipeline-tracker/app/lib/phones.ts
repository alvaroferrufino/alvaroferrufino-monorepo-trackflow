import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { COUNTRY_LABELS } from "./countries";

const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
const countryName = (country: CountryCode) => COUNTRY_LABELS[country] ?? regionNames.of(country) ?? country;

export const PHONE_OPTIONS = getCountries().map((country) => ({ country, label: `+${getCountryCallingCode(country)} ${countryName(country)}` })).sort((first, second) => countryName(first.country).localeCompare(countryName(second.country), "es"));

export function getPhoneFields(phone: string | null, preferredCountry: string | null) {
  const fallback: CountryCode = getCountries().includes(preferredCountry as CountryCode) ? preferredCountry as CountryCode : "ES";
  const parsed = phone ? parsePhoneNumberFromString(phone, fallback) : null;
  const country = preferredCountry && parsed?.countryCallingCode === getCountryCallingCode(fallback) ? fallback : parsed?.country ?? fallback;
  return { country, number: parsed?.nationalNumber ?? phone ?? "" };
}

export function internationalPhone(number: string, country: CountryCode): string | null {
  if (!/^[+\d\s().-]+$/.test(number)) return null;
  const parsed = parsePhoneNumberFromString(number, country);
  return parsed?.isPossible() && parsed.countryCallingCode === getCountryCallingCode(country) ? parsed.number : null;
}