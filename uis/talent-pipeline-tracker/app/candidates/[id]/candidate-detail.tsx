"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getLabel, isTerminalStatus, STAGE_LABELS, STATUS_LABELS } from "../../lib/labels";

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  position: string;
  years_experience: number | null;
  linkedin_url: string | null;
  cv_url: string | null;
  status: string;
  stage: string;
  created_at: string | null;
}

type LoadState =
  | { key: string; status: "success"; data: Candidate }
  | { key: string; status: "error"; message: string; notFound: boolean }
  | null;

const dateFormatter = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" });

function pickString(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function pickNumber(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = Number(source[key]);
    if (source[key] !== null && source[key] !== "" && Number.isFinite(value)) return value;
  }
  return null;
}

function parseCandidate(payload: unknown): Candidate | null {
  if (typeof payload !== "object" || payload === null) return null;
  const wrapper = payload as Record<string, unknown>;
  const inner = wrapper.data ?? wrapper.record ?? wrapper.candidate;
  const source = (typeof inner === "object" && inner !== null && !Array.isArray(inner) ? inner : wrapper) as Record<string, unknown>;

  const id = pickString(source, "id");
  const fullName = pickString(source, "full_name", "name");
  if (!id || !fullName) return null;

  return {
    id,
    full_name: fullName,
    email: pickString(source, "email") ?? "",
    phone: pickString(source, "phone", "phone_number"),
    position: pickString(source, "position") ?? "",
    years_experience: pickNumber(source, "years_experience", "years_of_experience", "experience_years"),
    linkedin_url: pickString(source, "linkedin_url", "linkedin"),
    cv_url: pickString(source, "cv_url", "cv", "resume_url"),
    status: pickString(source, "status") ?? "",
    stage: pickString(source, "stage") ?? "",
    created_at: pickString(source, "created_at", "applied_at", "date"),
  };
}

// Only http(s) links are rendered to avoid javascript: and similar schemes.
function safeUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function ExternalLink({ href, label }: { href: string | null; label: string }) {
  const url = safeUrl(href);
  if (!url) return href ? <span className="break-all">{href}</span> : null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-emerald-800 hover:underline">
      {label}
    </a>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-zinc-900">{children || <span className="text-zinc-400">No disponible</span>}</dd>
    </div>
  );
}

export default function CandidateDetail({ candidateId }: { candidateId: string }) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<LoadState>(null);
  const [savingField, setSavingField] = useState<"status" | "stage" | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const updateInFlight = useRef(false);
  const requestKey = `${candidateId}:${retry}`;
  const current = result?.key === requestKey ? result : null;

  useEffect(() => {
    const controller = new AbortController();

    async function loadCandidate() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!baseUrl) {
          throw new Error("Falta configurar NEXT_PUBLIC_API_URL.");
        }
        const response = await fetch(
          `${baseUrl.replace(/\/$/, "")}/records/${encodeURIComponent(candidateId)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (response.status === 404) {
          setResult({ key: requestKey, status: "error", message: "El candidato no existe o ha sido eliminado.", notFound: true });
          return;
        }
        if (!response.ok) {
          throw new Error(`La petición falló (HTTP ${response.status}).`);
        }
        const candidate = parseCandidate(await response.json().catch(() => null));
        if (!candidate) {
          throw new Error("La API devolvió datos del candidato incompletos.");
        }
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, status: "success", data: candidate });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({
            key: requestKey,
            status: "error",
            message: error instanceof Error ? error.message : "Error de conexión.",
            notFound: false,
          });
        }
      }
    }

    void loadCandidate();
    return () => controller.abort();
  }, [candidateId, requestKey]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  async function handleUpdate(field: "status" | "stage", value: string) {
    if (updateInFlight.current || current?.status !== "success" || current.data[field] === value) return;
    if (field === "stage" && (isTerminalStatus(current.data.status) || value.toLowerCase() === "completed")) return;
    setSuccessMessage("");
    const options = field === "status" ? STATUS_LABELS : STAGE_LABELS;
    if (!Object.hasOwn(options, value)) {
      setUpdateError(`El valor seleccionado para ${field === "status" ? "el estado" : "la etapa"} no es válido.`);
      return;
    }
    const previousValue = current.data[field];
    updateInFlight.current = true;
    setSavingField(field);
    setUpdateError(null);
    setResult((previous) => previous?.key === requestKey && previous.status === "success"
      ? { ...previous, data: { ...previous.data, [field]: value } }
      : previous);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error("Falta configurar NEXT_PUBLIC_API_URL.");
      const response = await fetch(
        `${baseUrl.replace(/\/$/, "")}/records/${encodeURIComponent(candidateId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail = payload?.detail ?? payload?.message ?? payload?.error;
        throw new Error(typeof detail === "string" && detail
          ? `${detail} (HTTP ${response.status}).`
          : `La petición falló (HTTP ${response.status}).`);
      }
      setSuccessMessage("Cambios guardados con éxito.");
    } catch (error) {
      setResult((previous) => previous?.key === requestKey && previous.status === "success"
        ? { ...previous, data: { ...previous.data, [field]: previousValue } }
        : previous);
      setUpdateError(`No se pudo actualizar ${field === "status" ? "el estado" : "la etapa"}: ${error instanceof Error ? error.message : "Error de conexión."}`);
    } finally {
      updateInFlight.current = false;
      setSavingField(null);
    }
  }

  if (!current) {
    return <p role="status" aria-busy="true" className="py-6 text-zinc-600">Cargando datos del candidato...</p>;
  }

  if (current.status === "error") {
    return (
      <div className="mb-8 border-l-4 border-red-600 bg-red-50 p-5 text-red-900">
        <div role="alert">
          <p className="font-semibold">No se pudieron cargar los datos del candidato.</p>
          <p className="mt-1 text-sm">{current.message}</p>
        </div>
        {!current.notFound && (
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="mt-4 rounded-md border border-red-700 px-4 py-2 text-sm font-medium hover:bg-red-100"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  const candidate = current.data;
  const years = candidate.years_experience;
  const isTerminalState = isTerminalStatus(candidate.status);

  return (
    <section aria-labelledby="candidate-name" className="mb-10">
      <h2 id="candidate-name" className="break-words text-2xl font-semibold">{candidate.full_name}</h2>
      {candidate.position && <p className="mt-1 text-zinc-600">{candidate.position}</p>}
      <dl className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Email">
          {candidate.email && (
            <a href={`mailto:${candidate.email}`} className="break-all text-emerald-800 hover:underline">{candidate.email}</a>
          )}
        </Field>
        <Field label="Teléfono">
          {candidate.phone && (
            <a href={`tel:${candidate.phone.replace(/[^\d+]/g, "")}`} className="text-emerald-800 hover:underline">{candidate.phone}</a>
          )}
        </Field>
        <Field label="Puesto">{candidate.position}</Field>
        <Field label="Años de experiencia">
          {years !== null && `${years} ${years === 1 ? "año" : "años"}`}
        </Field>
        <Field label="LinkedIn"><ExternalLink href={candidate.linkedin_url} label="Ver perfil de LinkedIn" /></Field>
        <Field label="CV"><ExternalLink href={candidate.cv_url} label="Ver CV" /></Field>
        <Field label="Estado">
          <select
            aria-label="Estado"
            value={candidate.status}
            onChange={(event) => void handleUpdate("status", event.target.value)}
            disabled={savingField !== null}
            aria-busy={savingField === "status"}
            aria-describedby={updateError ? "candidate-update-error" : undefined}
            className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-700 disabled:cursor-wait disabled:bg-zinc-100"
          >
            {!Object.hasOwn(STATUS_LABELS, candidate.status) && (
              <option value={candidate.status} disabled>
                {getLabel(STATUS_LABELS, candidate.status, candidate.status || "No disponible")}
              </option>
            )}
            <option value="received">Recibida</option>
            <option value="in_progress">En proceso</option>
            <option value="selected">Seleccionada</option>
            <option value="discarded">Descartada</option>
          </select>
        </Field>
        <Field label="Etapa">
          <select
            aria-label="Etapa"
            value={isTerminalState ? "completed" : candidate.stage}
            onChange={(event) => void handleUpdate("stage", event.target.value)}
            disabled={isTerminalState || savingField !== null}
            aria-busy={savingField === "stage"}
            aria-describedby={updateError ? "candidate-update-error" : undefined}
            className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-700 disabled:cursor-wait disabled:bg-zinc-100"
          >
            {isTerminalState && <option value="completed" disabled>Concluida</option>}
            {!isTerminalState && (!Object.hasOwn(STAGE_LABELS, candidate.stage) || candidate.stage === "completed") && (
              <option value={candidate.stage} disabled>
                {getLabel(STAGE_LABELS, candidate.stage, candidate.stage || "No disponible")}
              </option>
            )}
            <option value="pending">Pendiente de revisión</option>
            <option value="review">En revisión</option>
            <option value="personal_interview">Entrevista personal</option>
            <option value="technical_interview">Entrevista técnica</option>
            <option value="offer_presented">Oferta presentada</option>
          </select>
        </Field>
        <Field label="Fecha de candidatura">
          {candidate.created_at && <time dateTime={candidate.created_at}>{formatDate(candidate.created_at)}</time>}
        </Field>
      </dl>
      <p role="status" className="mt-3 min-h-5 text-sm text-zinc-500">
        {savingField && `Guardando ${savingField === "status" ? "estado" : "etapa"}...`}
      </p>
      {successMessage && (
        <p role="status" className="mt-3 border-l-4 border-emerald-600 bg-emerald-50 p-3 text-sm text-emerald-900">
          {successMessage}
        </p>
      )}
      {updateError && (
        <p id="candidate-update-error" role="alert" className="mt-3 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-900">
          {updateError}
        </p>
      )}
    </section>
  );
}
