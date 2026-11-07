export async function hasDuplicateEmail(baseUrl: string, email: string, excludedId?: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  let loaded = 0;
  let page = 1;
  let total = 0;
  do {
    const url = new URL(`${baseUrl.replace(/\/$/, "")}/records`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", "100");
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo comprobar si el email ya existe (HTTP ${response.status}).`);
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null || !("data" in payload) || !Array.isArray(payload.data) || !("total" in payload) || typeof payload.total !== "number" || !Number.isInteger(payload.total) || payload.total < 0) {
      throw new Error("La API no devolvió un pipeline válido para comprobar duplicados.");
    }
    total = payload.total;
    for (const record of payload.data as unknown[]) {
      if (typeof record !== "object" || record === null || !("id" in record) || typeof record.id !== "string" || !("email" in record) || typeof record.email !== "string") throw new Error("La API devolvió datos incompletos al comprobar duplicados.");
      if (record.id !== excludedId && record.email.trim().toLowerCase() === normalizedEmail) return true;
    }
    loaded += payload.data.length;
    if (payload.data.length === 0 && loaded < total) throw new Error("No se pudo consultar todo el pipeline para comprobar duplicados.");
    page += 1;
  } while (loaded < total);
  return false;
}