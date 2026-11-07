import { parseCandidate, type Candidate, type CandidateInput } from "./candidates";

type Extension = Pick<CandidateInput, "phone_country" | "country" | "location" | "work_authorization" | "availability" | "availability_details" | "expected_salary" | "recruitment_source" | "relevant_urls" | "cv_file" | "additional_files">;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("trackflow-candidates", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("extensions");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("No se pudo abrir el almacenamiento local de candidaturas."));
    request.onblocked = () => reject(new Error("El almacenamiento local está bloqueado por otra pestaña."));
  });
}

async function accessExtension(baseUrl: string, id: string, extension?: Extension): Promise<unknown> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction("extensions", extension ? "readwrite" : "readonly");
      const store = transaction.objectStore("extensions");
      const key = JSON.stringify([baseUrl.replace(/\/$/, ""), id]);
      const request = extension ? store.put(extension, key) : store.get(key);
      let result: unknown;
      request.onsuccess = () => { result = request.result; };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(new Error("No se pudo acceder al complemento local. Comprueba los permisos y el espacio disponible del navegador."));
      transaction.onabort = () => reject(new Error("Se canceló el almacenamiento del complemento local."));
    });
  } finally {
    database.close();
  }
}

export async function saveCandidateExtension(baseUrl: string, id: string, input: CandidateInput): Promise<void> {
  const { phone_country, country, location, work_authorization, availability, availability_details, expected_salary, recruitment_source, relevant_urls, cv_file, additional_files } = input;
  await accessExtension(baseUrl, id, { phone_country, country, location, work_authorization, availability, availability_details, expected_salary, recruitment_source, relevant_urls, cv_file, additional_files });
}

export async function restoreCandidateExtension(baseUrl: string, candidate: Candidate): Promise<Candidate> {
  const extension = await accessExtension(baseUrl, candidate.id);
  if (typeof extension !== "object" || extension === null) return candidate;
  return parseCandidate({ ...candidate, ...extension }) ?? candidate;
}