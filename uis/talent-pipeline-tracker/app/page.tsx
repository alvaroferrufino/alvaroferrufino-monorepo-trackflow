"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const STATUS_LABELS = {
  received: "Recibida",
  in_progress: "En proceso",
  selected: "Seleccionada",
  discarded: "Descartada",
};

const STAGE_LABELS = {
  pending: "Pendiente de revisión",
  review: "En revisión",
  personal_interview: "Entrevista personal",
  technical_interview: "Entrevista técnica",
  offer_presented: "Oferta presentada",
};

interface Application {
  id: string;
  full_name: string;
  email: string;
  position: string;
  status: string;
  stage: string;
}

type LoadState =
  | { key: string; status: "success"; data: Application[] }
  | { key: string; status: "error"; message: string }
  | null;

function isApplication(value: unknown): value is Application {
  return (
    typeof value === "object" &&
    value !== null &&
    ["id", "full_name", "email", "position", "status", "stage"].every(
      (field) => field in value && typeof value[field as keyof typeof value] === "string",
    )
  );
}

function getLabel(labels: Record<string, string>, value: string, fallback: string) {
  return Object.hasOwn(labels, value) ? labels[value] : fallback;
}

function Loading() {
  return <p role="status" className="py-10 text-zinc-600">Cargando candidaturas...</p>;
}

function ApplicationList() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<LoadState>(null);
  const statusParam = searchParams.get("status") ?? "";
  const stageParam = searchParams.get("stage") ?? "";
  const status = Object.hasOwn(STATUS_LABELS, statusParam) ? statusParam : "";
  const stage = Object.hasOwn(STAGE_LABELS, stageParam) ? stageParam : "";
  const requestKey = JSON.stringify([status, stage, retry]);
  const currentResult = result?.key === requestKey ? result : null;

  useEffect(() => {
    const controller = new AbortController();

    async function loadApplications() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!baseUrl) {
          throw new Error("Falta configurar NEXT_PUBLIC_API_URL.");
        }

        const data: Application[] = [];
        let page = 1;
        let total = 0;

        do {
          const url = new URL(`${baseUrl.replace(/\/$/, "")}/records`);
          url.searchParams.set("page", String(page));
          url.searchParams.set("limit", "100");
          if (status) url.searchParams.set("status", status);
          if (stage) url.searchParams.set("stage", stage);

          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) {
            throw new Error(`La petición falló (HTTP ${response.status}).`);
          }

          const payload = await response.json();
          if (
            !payload ||
            !Array.isArray(payload.data) ||
            !payload.data.every(isApplication) ||
            !Number.isInteger(payload.total) ||
            payload.total < 0 ||
            (payload.data.length === 0 && data.length < payload.total)
          ) {
            throw new Error("La API devolvió una respuesta no válida.");
          }

          data.push(...payload.data);
          total = payload.total;
          page += 1;
        } while (data.length < total);

        if (!controller.signal.aborted) {
          setResult({ key: requestKey, status: "success", data });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({
            key: requestKey,
            status: "error",
            message: error instanceof Error ? error.message : "Error de conexión.",
          });
        }
      }
    }

    void loadApplications();
    return () => controller.abort();
  }, [status, stage, requestKey]);

  function updateFilter(name: "status" | "stage", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.delete("page");
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}${window.location.hash}`, {
      scroll: false,
    });
  }

  const query = search.trim().toLocaleLowerCase("es");
  const applications = currentResult?.status === "success"
    ? currentResult.data.filter((application) =>
        application.full_name.toLocaleLowerCase("es").includes(query) ||
        application.email.toLocaleLowerCase("es").includes(query),
      )
    : [];
  const inputClass = "min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-700";

  return (
    <>
      <div className="grid gap-4 border-y border-zinc-200 py-5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
          Buscar por nombre o email
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre o email"
            className={inputClass}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
          Estado
          <select value={status} onChange={(event) => updateFilter("status", event.target.value)} className={inputClass}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">
          Etapa
          <select value={stage} onChange={(event) => updateFilter("stage", event.target.value)} className={inputClass}>
            <option value="">Todas las etapas</option>
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <section aria-label="Listado de candidaturas" aria-busy={!currentResult}>
        {!currentResult ? (
          <Loading />
        ) : currentResult.status === "error" ? (
          <div className="border-l-4 border-red-600 bg-red-50 p-5 text-red-900">
            <div role="alert">
              <p className="font-semibold">No se pudieron cargar las candidaturas.</p>
              <p className="mt-1 text-sm">{currentResult.message}</p>
            </div>
            <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-4 rounded-md border border-red-700 px-4 py-2 text-sm font-medium hover:bg-red-100">
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <p role="status" className="py-4 text-sm text-zinc-600">
              {applications.length} {applications.length === 1 ? "candidatura" : "candidaturas"}
            </p>
            {applications.length === 0 ? (
              <p className="py-8 text-zinc-600">No hay candidaturas que coincidan con la búsqueda y los filtros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-y border-zinc-200 bg-zinc-50 text-zinc-600">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Candidatura</th>
                      <th scope="col" className="px-4 py-3 font-medium">Puesto</th>
                      <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                      <th scope="col" className="px-4 py-3 font-medium">Etapa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {applications.map((application) => (
                      <tr key={application.id} className="hover:bg-zinc-50">
                        <th scope="row" className="max-w-xs break-words px-4 py-4 font-normal">
                          <span className="font-semibold">{application.full_name}</span>
                          <span className="mt-1 block text-zinc-600">{application.email}</span>
                        </th>
                        <td className="max-w-xs break-words px-4 py-4">{application.position}</td>
                        <td className="px-4 py-4">{getLabel(STATUS_LABELS, application.status, "Estado desconocido")}</td>
                        <td className="px-4 py-4">{getLabel(STAGE_LABELS, application.stage, "Etapa desconocida")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

export default function Home() {
  return (
    <main lang="es" className="min-h-screen w-full bg-white px-4 py-8 font-sans text-zinc-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 border-l-4 border-emerald-700 pl-4">
          <p className="text-lg font-semibold text-emerald-800">TrackFlow</p>
          <h1 className="mt-1 text-2xl font-semibold">Candidaturas</h1>
        </header>
        <Suspense fallback={<Loading />}>
          <ApplicationList />
        </Suspense>
      </div>
    </main>
  );
}
