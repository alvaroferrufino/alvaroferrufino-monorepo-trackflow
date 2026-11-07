"use client";

import { useRef, useState, type FormEvent } from "react";
import { parseCandidate, POSITION_OPTIONS, RECRUITMENT_SOURCE_OPTIONS, WORK_AUTHORIZATION_OPTIONS, type Candidate, type CandidateFile, type CandidateInput, type SavedCandidateInput } from "@/app/lib/candidates";
import { saveCandidateExtension } from "@/app/lib/candidate-storage";
import { hasDuplicateEmail } from "@/app/lib/candidate-duplicates";
import { getPhoneFields, internationalPhone, PHONE_OPTIONS } from "@/app/lib/phones";
import type { CountryCode } from "libphonenumber-js";
import { COUNTRY_LABELS, COUNTRY_OPTIONS } from "@/app/lib/countries";
import { LoaderCircle, Save, X } from "lucide-react";

type Props = {
  candidate?: Candidate;
  onSuccess: (input: SavedCandidateInput) => void;
  onCancel: () => void;
};

const fields = [
  { name: "full_name", label: "Nombre completo", type: "text", required: true, autoComplete: "name" },
  { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
  { name: "phone", label: "Teléfono", type: "tel", required: true, autoComplete: "tel" },
  { name: "position", label: "Puesto", options: POSITION_OPTIONS, required: true },
  { name: "experience_years", label: "Años de experiencia", type: "number", required: true, autoComplete: "off" },
  { name: "linkedin_url", label: "URL de LinkedIn", type: "url", required: false, autoComplete: "off" },
  { name: "location", label: "Ciudad de residencia", type: "text", required: true, autoComplete: "address-level2" },
  { name: "availability", label: "Disponibilidad (en días)", type: "number", required: true, autoComplete: "off" },
  { name: "expected_salary", label: "Expectativa salarial neta anual en euros", type: "number", required: true, autoComplete: "off" },
] as const;

const selectFields = [
  { name: "country", label: "País de residencia", options: COUNTRY_LABELS },
  { name: "work_authorization", label: "Permiso de trabajo o visado", options: WORK_AUTHORIZATION_OPTIONS },
  { name: "recruitment_source", label: "Fuente de reclutamiento", options: RECRUITMENT_SOURCE_OPTIONS },
] as const;

const orderedFields = [
  ...fields.slice(0, 6),
  selectFields[0],
  fields[6],
  selectFields[1],
  fields[7],
  fields[8],
  selectFields[2],
] as const;

const MAX_CV_SIZE = 5 * 1024 * 1024;
const MAX_ADDITIONAL_FILES = 5;
const MAX_ADDITIONAL_SIZE = 10 * 1024 * 1024;
const inputClass = "min-h-11 w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-700 disabled:bg-zinc-100 aria-invalid:border-red-600";

function selectedOption<Options extends Record<string, string>>(options: Options, value: string): keyof Options | null {
  return Object.hasOwn(options, value) ? value as keyof Options : null;
}

function serializeFile(file: File): Promise<CandidateFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`No se pudo leer el archivo ${file.name}.`));
    reader.onabort = () => reject(new Error(`Se interrumpió la lectura de ${file.name}.`));
    reader.onload = () => {
      if (typeof reader.result !== "string" || !reader.result.includes(",")) {
        reject(new Error(`No se pudo leer el archivo ${file.name}.`));
        return;
      }
      resolve({ name: file.name, type: file.type || "application/octet-stream", size: file.size, content_base64: reader.result.slice(reader.result.indexOf(",") + 1) });
    };
    reader.readAsDataURL(file);
  });
}

function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function savedCvUrl(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const wrapper = payload as Record<string, unknown>;
  const inner = wrapper.data ?? wrapper.record ?? wrapper;
  if (typeof inner !== "object" || inner === null || !("cv_url" in inner) || typeof inner.cv_url !== "string") return null;
  try {
    const url = new URL(inner.cv_url);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function apiError(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const source = payload as Record<string, unknown>;
  const detail = source.detail ?? source.message ?? source.error;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (!Array.isArray(detail)) return null;
  const messages = detail.flatMap((issue: unknown) => {
    if (typeof issue !== "object" || issue === null) return [];
    const value = issue as Record<string, unknown>;
    if (typeof value.msg !== "string") return [];
    const name = Array.isArray(value.loc) ? value.loc.at(-1) : null;
    const field = [...fields, ...selectFields].find((field) => field.name === name);
    const label = name === "cv_file" ? "CV" : field?.label;
    return [label ? `${label}: ${value.msg}` : value.msg];
  });
  return messages.length ? messages.join(". ") : null;
}

export default function CandidateForm({ candidate, onSuccess, onCancel }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CandidateInput, string>>>({});
  const [requestError, setRequestError] = useState("");
  const [retainedFiles, setRetainedFiles] = useState(candidate?.additional_files ?? []);
  const [selectedCv, setSelectedCv] = useState<File | null>(null);
  const [selectedAdditionalFiles, setSelectedAdditionalFiles] = useState<File[]>([]);
  const initialPhone = getPhoneFields(candidate?.phone ?? null, candidate?.phone_country ?? candidate?.country ?? null);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(initialPhone.country);
  const cvInput = useRef<HTMLInputElement>(null);
  const additionalFilesInput = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);

  function removeAdditionalFile(index: number) {
    const remaining = selectedAdditionalFiles.filter((_, fileIndex) => fileIndex !== index);
    setSelectedAdditionalFiles(remaining);
    if (additionalFilesInput.current) {
      const transfer = new DataTransfer();
      for (const file of remaining) transfer.items.add(file);
      additionalFilesInput.current.files = transfer.files;
      if (remaining.length === 0) additionalFilesInput.current.value = "";
    }
    setErrors((previous) => ({ ...previous, additional_files: undefined }));
    setRequestError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextErrors: Partial<Record<keyof CandidateInput, string>> = {};
    for (const field of fields) {
      const control = form.elements.namedItem(field.name);
      const value = String(data.get(field.name) ?? "").trim();
      if (field.required && !value) {
        nextErrors[field.name] = `Completa el campo ${field.label.toLocaleLowerCase("es")}.`;
      } else if ("options" in field) {
        if (!Object.hasOwn(field.options, value) && value !== candidate?.position) nextErrors.position = "Selecciona un puesto válido de TrackFlow.";
      } else if (control instanceof HTMLInputElement && !control.validity.valid) {
        nextErrors[field.name] = field.type === "email" ? "Introduce un email válido."
          : field.name === "experience_years" ? "Los años de experiencia deben estar entre 0 y 50."
          : field.name === "availability" ? "Introduce una cantidad de días entera, mayor o igual a cero."
          : field.type === "number" ? "Introduce un número válido, mayor o igual a cero."
          : "Introduce una URL válida con http:// o https://.";
      } else if (field.type === "url" && value) {
        try {
          if (!["http:", "https:"].includes(new URL(value).protocol)) throw new Error();
        } catch {
          nextErrors[field.name] = "Introduce una URL válida con http:// o https://.";
        }
      }
    }
    const availabilityValue = Number(String(data.get("availability") ?? ""));
    if (!nextErrors.availability && (!Number.isSafeInteger(availabilityValue) || availabilityValue < 0)) nextErrors.availability = "Introduce una cantidad de días entera, mayor o igual a cero.";
    const normalizedPhone = internationalPhone(String(data.get("phone") ?? "").trim(), phoneCountry);
    if (!normalizedPhone && !nextErrors.phone) nextErrors.phone = "Introduce un número de contacto válido para el prefijo seleccionado.";
    for (const field of selectFields) {
      const value = String(data.get(field.name) ?? "");
      if (!value || !Object.hasOwn(field.options, value)) nextErrors[field.name] = "Selecciona una opción válida.";
    }
    const relevantUrls = String(data.get("relevant_urls") ?? "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    if (relevantUrls.some((url) => !isHttpUrl(url))) nextErrors.relevant_urls = "Introduce URLs válidas con http:// o https://, una por línea.";
    const additionalFiles = selectedAdditionalFiles;
    if (additionalFiles.length + retainedFiles.length > MAX_ADDITIONAL_FILES) {
      nextErrors.additional_files = "Puedes adjuntar un máximo de 5 archivos adicionales.";
    } else if (additionalFiles.some((file) => file.size === 0 || file.size > MAX_CV_SIZE || !/\.(pdf|doc|docx|jpg|jpeg|png)$/i.test(file.name))) {
      nextErrors.additional_files = "Los archivos adicionales deben ser PDF, DOC, DOCX, JPG o PNG, no vacíos y de hasta 5 MB cada uno.";
    } else if ([...additionalFiles, ...retainedFiles].reduce((total, file) => total + file.size, 0) > MAX_ADDITIONAL_SIZE) {
      nextErrors.additional_files = "Los archivos adicionales superan el límite total de 10 MB.";
    }
    const cv = selectedCv;
    if (!(cv instanceof File) || cv.size === 0) {
      nextErrors.cv_file = "Selecciona un CV antes de enviar la candidatura.";
    } else if (!/\.(pdf|doc|docx)$/i.test(cv.name)) {
      nextErrors.cv_file = "El CV debe estar en formato PDF, DOC o DOCX.";
    } else if (cv.size > MAX_CV_SIZE) {
      nextErrors.cv_file = "El CV supera el tamaño máximo permitido de 5 MB.";
    }
    setErrors(nextErrors);
    setRequestError("");
    const workAuthorization = selectedOption(WORK_AUTHORIZATION_OPTIONS, String(data.get("work_authorization") ?? ""));
    const recruitmentSource = selectedOption(RECRUITMENT_SOURCE_OPTIONS, String(data.get("recruitment_source") ?? ""));
    const firstInvalid = [...orderedFields, { name: "relevant_urls" as const }, { name: "additional_files" as const }, { name: "cv_file" as const }].find((field) => nextErrors[field.name]);
    if (firstInvalid || !(cv instanceof File) || !workAuthorization || !recruitmentSource || !normalizedPhone) {
      const control = firstInvalid ? form.elements.namedItem(firstInvalid.name) : null;
      if (control instanceof HTMLElement) control.focus();
      return;
    }

    const text = (name: keyof CandidateInput) => String(data.get(name) ?? "").trim();
    inFlight.current = true;
    setSubmitting(true);
    let remoteSaved = false;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error("Falta configurar NEXT_PUBLIC_API_URL.");
      if (await hasDuplicateEmail(baseUrl, text("email"), candidate?.id)) {
        setErrors((previous) => ({ ...previous, email: "Este candidato ya se encuentra en el pipeline con ese email." }));
        return;
      }
      const input: CandidateInput = {
        full_name: text("full_name"),
        email: text("email"),
        phone: normalizedPhone,
        phone_country: phoneCountry,
        position: text("position"),
        experience_years: Number(text("experience_years")),
        linkedin_url: text("linkedin_url") || null,
        cv_url: candidate?.cv_url ?? null,
        cv_file: await serializeFile(cv),
        country: text("country"),
        location: text("location"),
        work_authorization: workAuthorization,
        availability: Number(text("availability")),
        availability_details: null,
        expected_salary: Number(text("expected_salary")),
        recruitment_source: recruitmentSource,
        relevant_urls: relevantUrls,
        additional_files: [...retainedFiles, ...await Promise.all(additionalFiles.map(serializeFile))],
      };
      const path = candidate ? `/records/${encodeURIComponent(candidate.id)}` : "/records";
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
        method: candidate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const message = apiError(await response.json().catch(() => null));
        throw new Error(message ? `${message} (HTTP ${response.status}).` : `La petición falló (HTTP ${response.status}).`);
      }
      remoteSaved = true;
      const payload: unknown = await response.json().catch(() => null);
      const id = candidate?.id ?? parseCandidate(payload)?.id;
      if (!id) throw new Error("La API no devolvió el ID necesario para guardar los datos profesionales y documentos en este navegador.");
      const cvUrl = savedCvUrl(payload);
      const savedInput = { ...input, cv_url: cvUrl ?? input.cv_url };
      await saveCandidateExtension(baseUrl, id, savedInput);
      onSuccess(savedInput);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error de conexión.";
      setRequestError(remoteSaved ? `La API guardó la candidatura, pero no se pudo guardar su complemento local: ${detail} Verifica la candidatura antes de reintentar.` : `No se pudo ${candidate ? "actualizar" : "registrar"} la candidatura: ${detail}`);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} aria-label={candidate ? "Editar candidatura" : "Nueva candidatura"} aria-busy={submitting} className="border-y border-zinc-200 py-6">
      <fieldset disabled={submitting} className="grid min-w-0 gap-5 sm:grid-cols-2">
        <legend className="mb-5 text-lg font-semibold">{candidate ? "Editar candidatura" : "Nueva candidatura"}</legend>
        <h2 className="text-sm font-semibold text-zinc-600 sm:col-span-2">Información para People &amp; Talent</h2>
        {orderedFields.map((field) => "options" in field ? (
          <label key={field.name} className="flex min-w-0 flex-col gap-2 text-sm font-medium">
            <span id={`label-${field.name}`}>{`${field.label} *`}</span>
            <select name={field.name} required aria-labelledby={`label-${field.name}`} autoComplete={field.name === "country" ? "country" : "off"} defaultValue={candidate?.[field.name] ?? ""} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `error-${field.name}` : undefined} onChange={() => { setErrors((previous) => ({ ...previous, [field.name]: undefined })); setRequestError(""); }} className={inputClass}>
              <option value="">Selecciona una opción</option>
              {candidate?.[field.name] && !Object.hasOwn(field.options, candidate[field.name] ?? "") && <option value={candidate[field.name] ?? ""} disabled={field.name !== "position"}>{candidate[field.name]}</option>}
              {(field.name === "country" ? COUNTRY_OPTIONS : Object.entries(field.options)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {errors[field.name] && <span id={`error-${field.name}`} role="alert" className="text-sm font-normal text-red-700">{errors[field.name]}</span>}
          </label>
        ) : (
          <div key={field.name} className="min-w-0">
            {field.name === "phone" && <label className="mb-3 flex min-w-0 flex-col gap-2 text-sm font-medium">Prefijo telefónico internacional *<select aria-label="Prefijo telefónico internacional" value={phoneCountry} onChange={(event) => { setPhoneCountry(event.target.value as CountryCode); setErrors((previous) => ({ ...previous, phone: undefined })); setRequestError(""); }} className={inputClass}>{PHONE_OPTIONS.map(({ country, label }) => <option key={country} value={country}>{label}</option>)}</select></label>}
          <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
            <span id={`label-${field.name}`}>{field.label}{field.required ? " *" : ""}</span>
            <input
              name={field.name}
              aria-labelledby={`label-${field.name}`}
              type={field.type}
              required={field.required}
              autoComplete={field.autoComplete}
              min={field.type === "number" ? 0 : undefined}
              max={field.name === "experience_years" ? 50 : undefined}
              step={field.name === "availability" ? 1 : field.type === "number" ? "any" : undefined}
              defaultValue={field.name === "phone" ? initialPhone.number : field.name === "experience_years" ? candidate?.years_experience ?? "" : candidate?.[field.name] ?? ""}
              aria-invalid={Boolean(errors[field.name])}
              aria-describedby={field.name === "availability" ? `availability-help${errors.availability ? " error-availability" : ""}` : errors[field.name] ? `error-${field.name}` : undefined}
              onChange={() => {
                setErrors((previous) => ({ ...previous, [field.name]: undefined }));
                setRequestError("");
              }}
              className={inputClass}
            />
            {errors[field.name] && <span id={`error-${field.name}`} role="alert" className="text-sm font-normal text-red-700">{errors[field.name]}</span>}
          </label>
          {field.name === "availability" && <p id="availability-help" className="mt-2 text-sm text-zinc-600">Indica cuántos días necesitas para incorporarte. 0 días significa disponibilidad inmediata.</p>}
          {field.name === "availability" && candidate?.availability === null && candidate.availability_details && <p className="mt-2 break-words text-sm text-zinc-600">Dato anterior: {candidate.availability_details}. Indica su equivalente en días.</p>}
          </div>
        ))}
        <label className="flex min-w-0 flex-col gap-2 text-sm font-medium sm:col-span-2">
          Otras URLs relevantes (GitHub, Portfolio)
          <textarea name="relevant_urls" rows={3} defaultValue={candidate?.relevant_urls.join("\n") ?? ""} placeholder="https://github.com/perfil&#10;https://portfolio.example.com" aria-invalid={Boolean(errors.relevant_urls)} aria-describedby={errors.relevant_urls ? "error-relevant-urls" : undefined} onChange={() => { setErrors((previous) => ({ ...previous, relevant_urls: undefined })); setRequestError(""); }} className={`${inputClass} py-2`} />
          {errors.relevant_urls && <span id="error-relevant-urls" role="alert" className="text-sm font-normal text-red-700">{errors.relevant_urls}</span>}
        </label>
        <div className="min-w-0 sm:col-span-2">
          <label htmlFor="cv-file" className="mb-2 block text-sm font-medium">CV *</label>
          <input ref={cvInput} id="cv-file" name="cv_file" type="file" accept=".pdf,.doc,.docx" required aria-invalid={Boolean(errors.cv_file)} aria-describedby={`cv-file-help${errors.cv_file ? " error-cv-file" : ""}`} onChange={(event) => { setSelectedCv(event.target.files?.[0] ?? null); setErrors((previous) => ({ ...previous, cv_file: undefined })); setRequestError(""); }} className={`${inputClass} h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium`} />
          <p id="cv-file-help" className="mt-2 text-sm text-zinc-600">Formatos aceptados: PDF, DOC, DOCX. Tamaño máximo permitido: 5 MB.</p>
          {errors.cv_file && <p id="error-cv-file" role="alert" className="mt-2 text-sm text-red-700">{errors.cv_file}</p>}
          {selectedCv && <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-3 text-sm"><span className="min-w-0 break-all">{selectedCv.name}</span><button type="button" aria-label={`Quitar CV ${selectedCv.name}`} onClick={() => { setSelectedCv(null); if (cvInput.current) cvInput.current.value = ""; setErrors((previous) => ({ ...previous, cv_file: undefined })); setRequestError(""); }} className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-100"><X size={16} aria-hidden="true" /> Quitar archivo</button></div>}
          {candidate && <p className="mt-2 text-sm text-zinc-600">Selecciona el CV que acompañará esta actualización.</p>}
        </div>
        <div className="min-w-0 sm:col-span-2">
          <label htmlFor="additional-files" className="mb-2 block text-sm font-medium">Archivos adicionales (opcional)</label>
          <input ref={additionalFilesInput} id="additional-files" name="additional_files" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" aria-invalid={Boolean(errors.additional_files)} aria-describedby={`additional-files-help${errors.additional_files ? " error-additional-files" : ""}`} onChange={(event) => { setSelectedAdditionalFiles(Array.from(event.target.files ?? [])); setErrors((previous) => ({ ...previous, additional_files: undefined })); setRequestError(""); }} className={`${inputClass} h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium`} />
          <p id="additional-files-help" className="mt-2 text-sm text-zinc-600">Formatos aceptados: PDF, DOC, DOCX, JPG, PNG. Máximo 5 MB por archivo, 5 archivos y 10 MB en total.</p>
          {errors.additional_files && <p id="error-additional-files" role="alert" className="mt-2 text-sm text-red-700">{errors.additional_files}</p>}
          {selectedAdditionalFiles.length > 0 && <ul className="mt-3 space-y-2 text-sm">{selectedAdditionalFiles.map((file, index) => <li key={`${file.name}-${index}`} className="flex min-w-0 flex-wrap items-center justify-between gap-3"><span className="min-w-0 break-all">{file.name}</span><button type="button" aria-label={`Quitar adjunto seleccionado ${file.name}`} onClick={() => removeAdditionalFile(index)} className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-100"><X size={16} aria-hidden="true" /> Quitar archivo</button></li>)}</ul>}
          {retainedFiles.length > 0 && <ul className="mt-3 space-y-2 text-sm">{retainedFiles.map((file, index) => <li key={`${file.name}-${index}`} className="flex min-w-0 flex-wrap items-center justify-between gap-3"><span className="min-w-0 break-all">{file.name}</span><button type="button" aria-label={`Eliminar adjunto ${file.name}`} title={`Eliminar adjunto ${file.name}`} onClick={() => { setRetainedFiles((previous) => previous.filter((_, currentIndex) => currentIndex !== index)); setErrors((previous) => ({ ...previous, additional_files: undefined })); setRequestError(""); }} className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-100"><X size={16} aria-hidden="true" /> Quitar archivo</button></li>)}</ul>}
        </div>
      </fieldset>
      {requestError && <p role="alert" className="mt-5 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-900">{requestError}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
          {submitting ? <LoaderCircle size={18} aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <Save size={18} aria-hidden="true" />}
          {submitting ? "Guardando..." : candidate ? "Guardar cambios" : "Registrar candidatura"}
        </button>
        <button type="button" disabled={submitting} onClick={onCancel} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"><X size={18} aria-hidden="true" /> Cancelar</button>
      </div>
      {submitting && <p role="status" className="mt-3 text-sm text-zinc-600">{candidate ? "Actualizando candidatura..." : "Registrando candidatura..."}</p>}
    </form>
  );
}