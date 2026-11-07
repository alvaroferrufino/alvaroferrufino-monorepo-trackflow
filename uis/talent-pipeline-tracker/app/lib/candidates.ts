import type { CountryCode } from "libphonenumber-js";

export const POSITION_OPTIONS: Record<string, string> = Object.fromEntries([
  "Process Excellence Manager", "AI Engineer", "Project Manager", "Operations Lead",
  "Logística y Operaciones", "Data Analyst", "Frontend Developer", "Frontend Senior", "Backend Developer",
].map((position) => [position, position]));

export const WORK_AUTHORIZATION_OPTIONS = {
  valid_permit: "Permiso de trabajo vigente",
  visa_sponsorship: "Requiere patrocinio de visa",
} as const;

export const AVAILABILITY_OPTIONS = {
  immediate: "Inmediato",
  two_weeks: "2 semanas",
  one_month: "1 mes",
  more_than_one_month: "Más de 1 mes",
  other: "Otro",
} as const;

export const RECRUITMENT_SOURCE_OPTIONS = {
  linkedin: "LinkedIn",
  job_board: "Portal de empleo",
  referral: "Referido",
  social_media: "Redes sociales",
  other: "Otra fuente",
} as const;

export interface CandidateFile {
  name: string;
  type: string;
  size: number;
  content_base64: string;
}

export function isCandidateFile(value: unknown): value is CandidateFile {
  if (typeof value !== "object" || value === null) return false;
  const file = value as Record<string, unknown>;
  return typeof file.name === "string" && typeof file.type === "string" &&
    typeof file.size === "number" && Number.isFinite(file.size) && file.size > 0 &&
    typeof file.content_base64 === "string" && file.content_base64.length > 0;
}

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  phone_country: string | null;
  position: string;
  years_experience: number | null;
  linkedin_url: string | null;
  cv_url: string | null;
  status: string;
  stage: string;
  created_at: string | null;
  location: string | null;
  work_authorization: string | null;
  availability: number | null;
  expected_salary: number | null;
  recruitment_source: string | null;
  country: string | null;
  availability_details: string | null;
  relevant_urls: string[];
  cv_file: CandidateFile | null;
  additional_files: CandidateFile[];
}

export interface CandidateInput {
  full_name: string;
  email: string;
  phone: string;
  phone_country: CountryCode;
  position: string;
  experience_years: number;
  linkedin_url: string | null;
  cv_url: string | null;
  cv_file: CandidateFile;
  country: string;
  location: string;
  work_authorization: keyof typeof WORK_AUTHORIZATION_OPTIONS;
  availability: number;
  availability_details: string | null;
  expected_salary: number;
  recruitment_source: keyof typeof RECRUITMENT_SOURCE_OPTIONS;
  relevant_urls: string[];
  additional_files: CandidateFile[];
}

export type SavedCandidateInput = CandidateInput;

function deserialize(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  const decoded = deserialize(value);
  return typeof decoded === "object" && decoded !== null && !Array.isArray(decoded) ? decoded as Record<string, unknown> : null;
}

function pickString(source: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      const decoded = deserialize(value);
      return typeof decoded === "string" ? decoded.trim() : value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function pickNumber(source: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value !== "number" && !(typeof value === "string" && value.trim())) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function pickValue(source: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) if (source[key] !== null && source[key] !== undefined) return deserialize(source[key]);
  return null;
}

function parseFile(value: unknown): CandidateFile | null {
  const file = asObject(value);
  if (!file) return null;
  const normalized = {
    name: pickString(file, "name", "filename", "fileName"),
    type: pickString(file, "type", "mime_type", "mimeType") ?? "application/octet-stream",
    size: pickNumber(file, "size", "file_size", "fileSize"),
    content_base64: pickString(file, "content_base64", "contentBase64"),
  };
  return isCandidateFile(normalized) ? normalized : null;
}

export function getAvailabilityDays(value: unknown): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim().toLocaleLowerCase("es");
  const legacyDays: Record<string, number> = { immediate: 0, inmediato: 0, two_weeks: 14, one_month: 30 };
  if (Object.hasOwn(legacyDays, normalized)) return legacyDays[normalized];
  const match = normalized.match(/^(\d+)\s*(d[ií]as?|days?|semanas?|weeks?|mes(?:es)?|months?)?$/);
  if (!match) return null;
  const multiplier = /^(semana|week)/.test(match[2] ?? "") ? 7 : /^(mes|month)/.test(match[2] ?? "") ? 30 : 1;
  const days = Number(match[1]) * multiplier;
  return Number.isSafeInteger(days) ? days : null;
}

export function parseCandidate(payload: unknown): Candidate | null {
  const wrapper = asObject(payload);
  if (!wrapper) return null;
  const source = asObject(wrapper.data ?? wrapper.record ?? wrapper.candidate) ?? wrapper;
  const id = pickString(source, "id");
  const fullName = pickString(source, "full_name", "fullName", "name");
  if (!id || !fullName) return null;
  const rawUrls = pickValue(source, "relevant_urls", "relevantUrls", "additional_urls");
  const urls = Array.isArray(rawUrls) ? rawUrls : typeof rawUrls === "string" ? rawUrls.split(/\r?\n/) : [];
  const rawFiles = pickValue(source, "additional_files", "additionalFiles", "attachments");
  const availabilityDetails = pickString(source, "availability_details", "availabilityDetails");
  const rawAvailability = pickString(source, "availability", "availability_days", "availabilityDays", "notice_period", "noticePeriod");
  const availability = getAvailabilityDays(rawAvailability === "other" ? availabilityDetails : rawAvailability);
  return {
    id,
    full_name: fullName,
    email: pickString(source, "email") ?? "",
    phone: pickString(source, "phone", "phone_number", "phoneNumber"),
    phone_country: pickString(source, "phone_country", "phoneCountry"),
    position: pickString(source, "position") ?? "",
    years_experience: pickNumber(source, "years_experience", "years_of_experience", "experience_years", "experienceYears"),
    linkedin_url: pickString(source, "linkedin_url", "linkedinUrl", "linkedin"),
    cv_url: pickString(source, "cv_url", "cvUrl", "cv", "resume_url"),
    status: pickString(source, "status") ?? "",
    stage: pickString(source, "stage") ?? "",
    created_at: pickString(source, "created_at", "createdAt", "applied_at", "date"),
    country: pickString(source, "country", "residence_country", "countryOfResidence"),
    location: pickString(source, "location", "city", "residence_city", "cityOfResidence"),
    work_authorization: pickString(source, "work_authorization", "workAuthorization", "work_permit"),
    availability,
    availability_details: availabilityDetails ?? (availability === null && typeof rawAvailability === "string" && rawAvailability.trim() ? rawAvailability.trim() : null),
    expected_salary: pickNumber(source, "expected_salary", "expectedSalary", "salary_expectation"),
    recruitment_source: pickString(source, "recruitment_source", "recruitmentSource"),
    relevant_urls: urls.flatMap((value) => typeof value === "string" && value.trim() ? [value.trim()] : []),
    cv_file: parseFile(pickValue(source, "cv_file", "cvFile")),
    additional_files: Array.isArray(rawFiles) ? rawFiles.flatMap((value) => { const file = parseFile(value); return file ? [file] : []; }) : [],
  };
}