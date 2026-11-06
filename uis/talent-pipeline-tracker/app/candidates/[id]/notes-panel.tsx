"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

const DEFAULT_AUTHOR = "Equipo TrackFlow";
const MAX_AUTHOR_LENGTH = 100;
const MAX_CONTENT_LENGTH = 2000;

interface Note {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

interface FieldErrors {
  author?: string;
  content?: string;
}

const dateFormatter = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" });

function notesUrl(candidateId: string, noteId?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("Falta configurar NEXT_PUBLIC_API_URL.");
  }
  const notePath = noteId ? `/${encodeURIComponent(noteId)}` : "";
  return `${baseUrl.replace(/\/$/, "")}/records/${encodeURIComponent(candidateId)}/notes${notePath}`;
}

function normalizeNote(value: unknown, fallbackAuthor = DEFAULT_AUTHOR, knownAuthors?: ReadonlyMap<string, string>): Note {
  const note = typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};
  const id = String(note.id || note._id || Math.random());
  return {
    id,
    content: String(note.content || note.text || note.body || note.message || ""),
    author: String(note.author || note.user || note.created_by || knownAuthors?.get(id) || fallbackAuthor),
    created_at: String(note.createdAt || note.created_at || note.date || new Date().toISOString()),
  };
}

function extractNotes(payload: unknown, knownAuthors?: ReadonlyMap<string, string>): Note[] {
  let items: unknown = payload;
  if (!Array.isArray(items) && typeof items === "object" && items !== null) {
    const wrapper = items as Record<string, unknown>;
    items = Array.isArray(wrapper.notes) ? wrapper.notes : wrapper.data;
  }
  if (!Array.isArray(items)) {
    throw new Error("El servidor devolvió un listado de notas no válido.");
  }
  return items.map((item) => normalizeNote(item, DEFAULT_AUTHOR, knownAuthors));
}

function sortNotes(notes: Note[]) {
  return [...notes].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
}

async function fetchNotes(candidateId: string, signal?: AbortSignal, knownAuthors?: ReadonlyMap<string, string>) {
  const response = await fetch(notesUrl(candidateId), { signal, cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const payload: unknown = await response.json();
  return sortNotes(extractNotes(payload, knownAuthors));
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

async function readError(response: Response) {
  try {
    const payload = await response.json();
    const detail = payload?.detail ?? payload?.message ?? payload?.error;
    if (typeof detail === "string" && detail) {
      return `${detail} (HTTP ${response.status})`;
    }
  } catch {
    // Response without a JSON body.
  }
  return `La petición falló (HTTP ${response.status}).`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error de conexión.";
}

export default function NotesPanel({ candidateId }: { candidateId: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [author, setAuthor] = useState(DEFAULT_AUTHOR);
  const [content, setContent] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const loadController = useRef<AbortController | null>(null);
  const knownAuthors = useRef(new Map<string, string>());

  useEffect(() => {
    const controller = new AbortController();
    loadController.current = controller;

    async function loadNotes() {
      try {
        const loadedNotes = await fetchNotes(candidateId, controller.signal, knownAuthors.current);
        if (!controller.signal.aborted) {
          setNotes(loadedNotes);
          setLoadError(null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(errorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsRefreshing(false);
        }
      }
    }

    void loadNotes();
    return () => controller.abort();
  }, [candidateId, reloadKey]);

  function refreshNotes() {
    setIsRefreshing(true);
    setReloadKey((value) => value + 1);
  }

  function validate(authorValue: string, contentValue: string): FieldErrors {
    const errors: FieldErrors = {};
    if (!authorValue) errors.author = "El autor es obligatorio.";
    else if (authorValue.length > MAX_AUTHOR_LENGTH) errors.author = `Máximo ${MAX_AUTHOR_LENGTH} caracteres.`;
    if (!contentValue) errors.content = "La nota no puede estar vacía.";
    else if (contentValue.length > MAX_CONTENT_LENGTH) errors.content = `Máximo ${MAX_CONTENT_LENGTH} caracteres.`;
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const authorValue = author.trim();
    const contentValue = content.trim();
    const errors = validate(authorValue, contentValue);
    setFieldErrors(errors);
    setSubmitError(null);
    setStatusMessage("");
    if (errors.author || errors.content) return;

    setIsSubmitting(true);
    let wasCreated = false;
    try {
      const response = await fetch(notesUrl(candidateId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: authorValue, content: contentValue }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      wasCreated = true;
      loadController.current?.abort();
      setIsRefreshing(true);
      let invalidPostResponse = false;
      const payload: unknown = await response.json().catch(() => {
        invalidPostResponse = true;
        return null;
      });
      const data = typeof payload === "object" && payload !== null
        ? payload as Record<string, unknown>
        : null;
      const created = normalizeNote(data?.note || data?.data || payload, authorValue);
      knownAuthors.current.set(created.id, created.author);
      if (!created.content) created.content = contentValue;
      setNotes((current) => sortNotes([created, ...(current ?? []).filter((note) => note.id !== created.id)]));
      setContent("");
      setStatusMessage("Nota añadida correctamente.");
      const loadedNotes = await fetchNotes(candidateId, undefined, knownAuthors.current);
      setNotes(loadedNotes);
      setLoadError(null);
      if (invalidPostResponse) {
        throw new Error("El POST devolvió una respuesta JSON no válida; el listado se ha actualizado.");
      }
    } catch (error) {
      setSubmitError(wasCreated
        ? `El servidor aceptó la nota, pero hubo un error al procesar la respuesta o sincronizar el listado. Revisa las notas antes de volver a enviarla: ${errorMessage(error)}`
        : errorMessage(error));
    } finally {
      setIsSubmitting(false);
      setIsRefreshing(false);
    }
  }

  async function handleDelete(note: Note) {
    if (deletingIds.has(note.id)) return;
    if (!window.confirm("¿Seguro que quieres eliminar esta nota?")) return;

    setDeleteError(null);
    setStatusMessage("");
    setDeletingIds((current) => new Set(current).add(note.id));
    try {
      const response = await fetch(notesUrl(candidateId, note.id), { method: "DELETE" });
      // 404 means the note no longer exists, which is the desired end state.
      if (!response.ok && response.status !== 404) {
        throw new Error(await readError(response));
      }
      setNotes((current) => current?.filter((item) => item.id !== note.id) ?? current);
      setStatusMessage("Nota eliminada correctamente.");
      refreshNotes();
    } catch (error) {
      setDeleteError(`No se pudo eliminar la nota: ${errorMessage(error)}`);
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(note.id);
        return next;
      });
    }
  }

  const inputClass =
    "w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-700 disabled:bg-zinc-100";

  return (
    <section aria-labelledby="notes-title" className="border-t border-zinc-200 pt-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id="notes-title" className="text-xl font-semibold">Notas internas</h2>
        {isRefreshing && notes !== null && (
          <span className="text-sm text-zinc-500">Actualizando...</span>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-5 grid gap-4 rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="note-author" className="text-sm font-medium">Autor</label>
          <input
            id="note-author"
            type="text"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            maxLength={MAX_AUTHOR_LENGTH}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.author)}
            aria-describedby={fieldErrors.author ? "note-author-error" : undefined}
            className={`${inputClass} min-h-11 ${fieldErrors.author ? "border-red-600" : "border-zinc-300"}`}
          />
          {fieldErrors.author && (
            <p id="note-author-error" className="text-sm text-red-700">{fieldErrors.author}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="note-content" className="text-sm font-medium">Nueva nota</label>
          <textarea
            id="note-content"
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={MAX_CONTENT_LENGTH}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.content)}
            aria-describedby={`note-content-count${fieldErrors.content ? " note-content-error" : ""}`}
            className={`${inputClass} resize-y ${fieldErrors.content ? "border-red-600" : "border-zinc-300"}`}
          />
          <div className="flex justify-between gap-4 text-sm">
            <p id="note-content-error" className="text-red-700">{fieldErrors.content}</p>
            <p id="note-content-count" className="shrink-0 text-zinc-500">
              {content.length}/{MAX_CONTENT_LENGTH}
            </p>
          </div>
        </div>

        {submitError && (
          <p role="alert" className="border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-900">
            No se pudo guardar la nota: {submitError}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="min-h-11 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Guardando..." : "Añadir nota"}
          </button>
        </div>
      </form>

      <p role="status" className="sr-only">{statusMessage}</p>

      {deleteError && (
        <p role="alert" className="mt-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-900">
          {deleteError}
        </p>
      )}

      <div aria-busy={notes === null || isRefreshing} className="mt-6">
        {loadError && (
          <div className="mb-4 border-l-4 border-red-600 bg-red-50 p-4 text-red-900">
            <div role="alert">
              <p className="font-semibold">
                {notes === null ? "No se pudieron cargar las notas." : "No se pudo actualizar el listado de notas."}
              </p>
              <p className="mt-1 text-sm">{loadError}</p>
            </div>
            <button
              type="button"
              onClick={refreshNotes}
              disabled={isRefreshing}
              className="mt-3 rounded-md border border-red-700 px-4 py-2 text-sm font-medium hover:bg-red-100 disabled:opacity-60"
            >
              {isRefreshing ? "Reintentando..." : "Reintentar"}
            </button>
          </div>
        )}

        {notes === null ? (
          !loadError && <p role="status" className="py-6 text-zinc-600">Cargando notas...</p>
        ) : notes.length === 0 ? (
          <p className="py-6 text-zinc-600">Este candidato todavía no tiene notas.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 border-y border-zinc-200">
            {notes.map((note) => {
              const isDeleting = deletingIds.has(note.id);
              return (
                <li key={note.id} className={`py-4 ${isDeleting ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{note.author}</p>
                      <time dateTime={note.created_at} className="text-sm text-zinc-500">
                        {formatDate(note.created_at)}
                      </time>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(note)}
                      disabled={isDeleting}
                      aria-label={`Eliminar nota de ${note.author}`}
                      className="shrink-0 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-800">{note.content}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
