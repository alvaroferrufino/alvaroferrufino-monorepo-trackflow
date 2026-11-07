import { expect, test, type Page, type Route } from "@playwright/test";
import type { CandidateInput } from "../app/lib/candidates";
import { getAvailabilityDays, parseCandidate } from "../app/lib/candidates";
import { COUNTRY_LABELS } from "../app/lib/countries";
import { getPhoneFields } from "../app/lib/phones";

const candidate = {
  id: "candidate-1", full_name: "Ana Torres", email: "ana@example.com",
  phone: "+34 600 000 000", position: "Frontend Developer", experience_years: 3.5,
  linkedin_url: "https://www.linkedin.com/in/ana", cv_url: "https://example.com/cv.pdf",
  status: "discarded", stage: "review", applied_at: "2026-11-01T12:00:00Z",
  updated_at: "2026-11-01T12:00:00Z", notes_count: 0,
  location: "Madrid", work_authorization: "valid_permit", availability: "2 semanas",
  expected_salary: 45000, recruitment_source: "referral",
  country: "ES", availability_details: null, relevant_urls: [], additional_files: [],
};

const cvContent = "%PDF-1.7\nTrackFlow test CV";
const cvFile = { name: "candidatura.pdf", mimeType: "application/pdf", buffer: Buffer.from(cvContent) };

function readJson(route: Route): CandidateInput {
  const request = route.request();
  expect(request.headers()["content-type"]).toBe("application/json");
  const payload = request.postDataJSON() as CandidateInput;
  expect(typeof payload.experience_years).toBe("number");
  expect(typeof payload.expected_salary).toBe("number");
  expect(Number.isInteger(payload.availability)).toBe(true);
  expect(payload.cv_file.content_base64).toBeTruthy();
  return payload;
}

const expectedCv = { name: cvFile.name, type: cvFile.mimeType, size: cvFile.buffer.length, content_base64: cvFile.buffer.toString("base64") };

test.beforeEach(async ({ page }) => {
  await page.route("**/records**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fulfill({ status: 500, json: { detail: "Escritura no simulada" } });
      return;
    }
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({ json: path.endsWith("/notes") ? [] : path.endsWith("/records") ? { data: [candidate], total: 1 } : candidate });
  });
});

async function openCreate(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Nueva candidatura", exact: true }).click();
}

async function fillCreate(page: Page, includeCv = true) {
  await page.getByLabel("Nombre completo").fill("  Beatriz Ruiz  ");
  await page.getByLabel("Email", { exact: false }).first().fill("beatriz@example.com");
  await page.getByLabel("Teléfono").fill("600123456");
  await page.getByLabel("Puesto", { exact: false }).selectOption("Backend Developer");
  await page.getByLabel("Años de experiencia").fill("0");
  await page.getByLabel("Ciudad de residencia").fill("Barcelona");
  await page.getByLabel("País de residencia").selectOption("ES");
  await page.getByLabel("Expectativa salarial neta anual en euros").fill("35000");
  await page.getByLabel("Permiso de trabajo o visado").selectOption("visa_sponsorship");
  await page.getByLabel("Disponibilidad (en días)").fill("0");
  await page.getByLabel("Fuente de reclutamiento").selectOption("linkedin");
  if (includeCv) await page.getByLabel("CV *", { exact: true }).setInputFiles(cvFile);
}

test("valida obligatorios, email, experiencia y enlaces sin enviar", async ({ page }) => {
  let writes = 0;
  page.on("request", (request) => { if (["POST", "PUT"].includes(request.method())) writes += 1; });
  await openCreate(page);
  const submit = page.getByRole("button", { name: "Registrar candidatura", exact: true });
  await submit.click();
  await expect(page.getByRole("form").getByRole("alert")).toHaveCount(12);
  await fillCreate(page);
  await page.getByLabel("Nombre completo").fill("   ");
  await page.getByLabel("Email", { exact: false }).first().fill("incorrecto");
  await page.getByLabel("Años de experiencia").fill("-1");
  await page.getByLabel("URL de LinkedIn").fill("javascript:alert(1)");
  await submit.click();
  await expect(page.getByRole("form").getByRole("alert")).toHaveCount(4);
  expect(writes).toBe(0);
});

test("POST completo, bloqueo de duplicados, confirmación y listado actualizado sin recarga", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let writes = 0;
  let payload: unknown;
  await page.route("**/records", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    writes += 1;
    payload = readJson(route);
    await pending;
    await route.fulfill({ status: 201, json: { ...candidate, ...payload as object, id: "candidate-2" } });
  });
  await openCreate(page);
  await page.evaluate(() => { Reflect.set(window, "navigationMarker", "preserved"); });
  await fillCreate(page);
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("button", { name: "Guardando...", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  await expect(page.getByLabel("Nombre completo")).toBeDisabled();
  await expect(page.getByRole("button", { name: `Quitar CV ${cvFile.name}` })).toBeDisabled();
  await page.getByRole("form", { name: "Nueva candidatura" }).evaluate((form) => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(writes).toBe(1);
  expect(payload).toEqual({ full_name: "Beatriz Ruiz", email: "beatriz@example.com", phone: "+34600123456", phone_country: "ES", position: "Backend Developer", experience_years: 0, linkedin_url: null, cv_url: null, cv_file: expectedCv, country: "ES", location: "Barcelona", work_authorization: "visa_sponsorship", availability: 0, availability_details: null, expected_salary: 35000, recruitment_source: "linkedin", relevant_urls: [], additional_files: [] });
  await page.route("**/records?**", (route) => route.fulfill({ json: { data: [{ ...candidate, ...payload as object, id: "candidate-2" }], total: 1 } }));
  release();
  await expect(page.getByText("Candidatura registrada con éxito.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Beatriz Ruiz" })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "navigationMarker"))).toBe("preserved");
});

test("error 422 conserva valores y archivo y permite reintentar", async ({ page }) => {
  let attempt = 0;
  await page.route("**/records", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    attempt += 1;
    await route.fulfill(attempt === 1
      ? { status: 422, json: { detail: [{ loc: ["body", "email"], msg: "Email ya registrado" }] } }
      : { status: 201, json: candidate });
  });
  await openCreate(page);
  await fillCreate(page);
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("Email ya registrado");
  await expect(page.getByLabel("Nombre completo")).toHaveValue("  Beatriz Ruiz  ");
  expect(await page.getByLabel("CV *", { exact: true }).evaluate((input) => (input as HTMLInputElement).files?.[0]?.name)).toBe(cvFile.name);
  await expect(page.getByRole("button", { name: "Registrar candidatura", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByText("Candidatura registrada con éxito.")).toBeVisible();
});

test("PUT pregrabado, valida obligatorios y actualiza el detalle conservando estado y etapa", async ({ page }) => {
  let payload: CandidateInput | undefined;
  await page.route("**/records/candidate-1", async (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    payload = readJson(route);
    await route.fulfill({ json: { ...candidate, ...payload } });
  });
  await page.goto("/candidates/candidate-1");
  await expect(page.getByLabel("Etapa", { exact: true })).toHaveValue("completed");
  await page.getByRole("button", { name: "Editar candidatura" }).click();
  for (const [label, value] of [["Nombre completo", candidate.full_name], ["Email", candidate.email], ["Teléfono", "600000000"], ["Puesto", candidate.position], ["Años de experiencia", "3.5"], ["URL de LinkedIn", candidate.linkedin_url], ["País de residencia", "ES"], ["Ciudad de residencia", candidate.location], ["Permiso de trabajo o visado", candidate.work_authorization], ["Disponibilidad (en días)", "14"], ["Expectativa salarial neta anual en euros", "45000"], ["Fuente de reclutamiento", candidate.recruitment_source]]) {
    await expect(page.getByLabel(label, { exact: false }).first()).toHaveValue(value);
  }
  await page.getByLabel("Puesto", { exact: false }).selectOption("");
  await page.getByLabel("CV *", { exact: true }).setInputFiles(cvFile);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("puesto");
  expect(payload).toBeUndefined();
  await page.getByLabel("Puesto", { exact: false }).selectOption("Frontend Senior");
  await page.getByLabel("Años de experiencia").fill("4.5");
  await page.getByLabel("Expectativa salarial neta anual en euros").fill("50000");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Candidatura actualizada con éxito.")).toBeVisible();
  expect(payload).toEqual({ full_name: candidate.full_name, email: candidate.email, phone: "+34600000000", phone_country: "ES", position: "Frontend Senior", experience_years: 4.5, linkedin_url: candidate.linkedin_url, cv_url: candidate.cv_url, cv_file: expectedCv, country: "ES", location: "Madrid", work_authorization: "valid_permit", availability: 14, availability_details: null, expected_salary: 50000, recruitment_source: "referral", relevant_urls: [], additional_files: [] });
  await expect(page.getByText("4.5 años")).toBeVisible();
  await expect(page.getByText("50000", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("discarded");
  await expect(page.getByLabel("Etapa", { exact: true })).toHaveValue("completed");
  await expect(page.getByLabel("Etapa", { exact: true })).toBeDisabled();
});

test("PUT fallido no modifica detalle y cancelar descarta los cambios", async ({ page }) => {
  await page.route("**/records/candidate-1", async (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    await route.fulfill({ status: 500, body: "Internal server error" });
  });
  await page.goto("/candidates/candidate-1");
  await page.getByRole("button", { name: "Editar candidatura" }).click();
  await page.getByLabel("Nombre completo").fill("Nombre modificado");
  await page.getByLabel("CV *", { exact: true }).setInputFiles(cvFile);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("HTTP 500");
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("heading", { name: "Ana Torres" })).toBeVisible();
  await page.getByRole("button", { name: "Editar candidatura" }).click();
  await expect(page.getByLabel("Nombre completo")).toHaveValue(candidate.full_name);
});

test("error de conexión libera el formulario", async ({ page }) => {
  await page.route("**/records", (route) => route.request().method() === "POST" ? route.abort("failed") : route.fallback());
  await openCreate(page);
  await fillCreate(page);
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("No se pudo registrar");
  await expect(page.getByRole("button", { name: "Registrar candidatura", exact: true })).toBeEnabled();
});

test("CV obligatorio incluso en edición; formatos y límite de 5 MB", async ({ page }) => {
  let writes = 0;
  page.on("request", (request) => { if (["POST", "PUT"].includes(request.method())) writes += 1; });
  await openCreate(page);
  await fillCreate(page, false);
  await expect(page.getByText("Formatos aceptados: PDF, DOC, DOCX. Tamaño máximo permitido: 5 MB.")).toBeVisible();
  const file = page.getByLabel("CV *", { exact: true });
  await expect(file).toHaveAttribute("accept", ".pdf,.doc,.docx");
  await expect(file).toHaveAttribute("required", "");
  const submit = page.getByRole("button", { name: "Registrar candidatura", exact: true });
  await submit.click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("Selecciona un CV");
  for (const invalid of [
    { name: "cv.exe", mimeType: "application/octet-stream", buffer: Buffer.from("invalid") },
    { name: "cv.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) },
    { name: "cv.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.alloc(0) },
  ]) {
    await file.setInputFiles(invalid);
    await submit.click();
    await expect(page.getByRole("form").getByRole("alert")).toBeVisible();
  }
  await page.goto("/candidates/candidate-1");
  await page.getByRole("button", { name: "Editar candidatura" }).click();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("Selecciona un CV");
  expect(writes).toBe(0);
});

test("acepta DOC, DOCX y PDF de exactamente 5 MB", async ({ page }) => {
  const uploads: { name: string; size: number }[] = [];
  await page.route("**/records", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const payload = readJson(route);
    uploads.push(payload.cv_file);
    await route.fulfill({ status: 201, json: candidate });
  });
  for (const file of [
    { name: "CV.DOC", mimeType: "application/msword", buffer: Buffer.from("test doc") },
    { name: "cv.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from("test docx") },
    { name: "cv.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(5 * 1024 * 1024) },
  ]) {
    await openCreate(page);
    await fillCreate(page, false);
    await page.getByLabel("CV *", { exact: true }).setInputFiles(file);
    await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
    await expect(page.getByText("Candidatura registrada con éxito.")).toBeVisible();
  }
  expect(uploads.map(({ name, size }) => ({ name, size }))).toEqual([{ name: "CV.DOC", size: 8 }, { name: "cv.docx", size: 9 }, { name: "cv.pdf", size: 5 * 1024 * 1024 }]);
});

test("salario obligatorio admite cero y rechaza vacíos y negativos", async ({ page }) => {
  let salary: unknown;
  await page.route("**/records", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const payload = readJson(route);
    salary = payload.expected_salary;
    await route.fulfill({ status: 201, json: candidate });
  });
  await openCreate(page);
  await fillCreate(page);
  const input = page.getByLabel("Expectativa salarial neta anual en euros *", { exact: true });
  await expect(input).toHaveAttribute("required", "");
  await input.fill("");
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("Completa el campo");
  expect(salary).toBeUndefined();
  await input.fill("-10");
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("mayor o igual a cero");
  expect(salary).toBeUndefined();
  await input.fill("0");
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByText("Candidatura registrada con éxito.")).toBeVisible();
  expect(salary).toBe(0);
});

test("POST sin ID no confirma guardado local completo", async ({ page }) => {
  await page.route("**/records", (route) => route.request().method() === "POST" ? route.fulfill({ status: 204 }) : route.fallback());
  await openCreate(page);
  await fillCreate(page);
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("La API guardó la candidatura");
  await expect(page.getByRole("form").getByRole("alert")).toContainText("ID necesario");
  await expect(page.getByText("Candidatura registrada con éxito.")).toHaveCount(0);
});

test("puestos profesionales y experiencia entre cero y cincuenta", async ({ page }) => {
  let payload: CandidateInput | undefined;
  await page.route("**/records", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    payload = readJson(route);
    return route.fulfill({ status: 201, json: { ...candidate, ...payload, id: "range-test" } });
  });
  await openCreate(page);
  await fillCreate(page);
  const position = page.getByLabel("Puesto *", { exact: true });
  expect(await position.evaluate((element) => element.tagName)).toBe("SELECT");
  for (const label of ["Process Excellence Manager", "AI Engineer", "Project Manager", "Operations Lead", "Logística y Operaciones"]) await expect(position.getByRole("option", { name: label, exact: true })).toBeAttached();
  const experience = page.getByLabel("Años de experiencia");
  await expect(experience).toHaveAttribute("min", "0");
  await expect(experience).toHaveAttribute("max", "50");
  await experience.fill("51");
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("entre 0 y 50");
  expect(payload).toBeUndefined();
  await experience.fill("50");
  await position.selectOption("AI Engineer");
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByText("Candidatura registrada con éxito.")).toBeVisible();
  expect(payload?.experience_years).toBe(50);
  expect(payload?.position).toBe("AI Engineer");
});

test("email duplicado con mayúsculas bloquea POST", async ({ page }) => {
  let writes = 0;
  page.on("request", (request) => { if (request.method() === "POST") writes += 1; });
  await openCreate(page);
  await fillCreate(page);
  await page.getByLabel("Email *", { exact: true }).fill("ANA@EXAMPLE.COM");
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("ya se encuentra en el pipeline");
  await expect(page.getByRole("button", { name: "Registrar candidatura", exact: true })).toBeEnabled();
  expect(writes).toBe(0);
});

test("email duplicado en segunda página bloquea PUT excluyendo el ID propio", async ({ page }) => {
  let writes = 0;
  page.on("request", (request) => { if (request.method() === "PUT") writes += 1; });
  await page.route("**/records?**", (route) => {
    const pageNumber = new URL(route.request().url()).searchParams.get("page");
    return route.fulfill({ json: { data: pageNumber === "2" ? [{ ...candidate, id: "other", email: "other@example.com" }] : [candidate], total: 2 } });
  });
  await page.goto("/candidates/candidate-1");
  await page.getByRole("button", { name: "Editar candidatura" }).click();
  await page.getByLabel("CV *", { exact: true }).setInputFiles(cvFile);
  await page.getByLabel("Email *", { exact: true }).fill("OTHER@example.com");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("ya se encuentra en el pipeline");
  expect(writes).toBe(0);
});

test("fallo de consulta de duplicados cancela el envío", async ({ page }) => {
  let writes = 0;
  page.on("request", (request) => { if (request.method() === "POST") writes += 1; });
  await openCreate(page);
  await fillCreate(page);
  await page.route("**/records?**", (route) => route.fulfill({ status: 503 }));
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("No se pudo comprobar");
  expect(writes).toBe(0);
});

test("prefijos por país y teléfono internacional consistente", async ({ page }) => {
  expect(getPhoneFields("+14155552671", "CA").country).toBe("CA");
  expect(getPhoneFields("+41791234567", null)).toEqual({ country: "CH", number: "791234567" });
  let payload: CandidateInput | undefined;
  await page.route("**/records", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    payload = readJson(route);
    return route.fulfill({ status: 201, json: { ...candidate, ...payload, id: "phone-test" } });
  });
  await openCreate(page);
  await fillCreate(page);
  const prefix = page.getByLabel("Prefijo telefónico internacional", { exact: true });
  for (const label of ["+34 España", "+41 Suiza", "+591 Bolivia"]) await expect(prefix.getByRole("option", { name: label, exact: true })).toBeAttached();
  await prefix.selectOption("BO");
  await page.getByLabel("Teléfono *", { exact: true }).fill("abc");
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("número de contacto válido");
  await page.getByLabel("Teléfono *", { exact: true }).fill("71234567");
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByText("Candidatura registrada con éxito.")).toBeVisible();
  expect(payload?.phone).toBe("+59171234567");
  expect(payload?.phone_country).toBe("BO");
});

test("POST y PUT persisten complementos pese a GET legacy y recargas", async ({ page }) => {
  let legacy = { ...candidate, id: "persisted", email: "beatriz@example.com", full_name: "Beatriz Ruiz" };
  await page.route("**/records", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const input = readJson(route);
    legacy = { ...legacy, phone: input.phone, position: input.position };
    return route.fulfill({ status: 201, json: { id: legacy.id, full_name: legacy.full_name, email: legacy.email } });
  });
  await page.route("**/records/persisted", (route) => {
    if (route.request().method() === "PUT") {
      const input = readJson(route);
      legacy = { ...legacy, phone: input.phone, position: input.position };
    }
    const { id, full_name, email, phone, position, status, stage, experience_years } = legacy;
    return route.fulfill({ json: { id, full_name, email, phone, position, status, stage, experience_years } });
  });
  await openCreate(page);
  await fillCreate(page);
  await page.getByLabel("Otras URLs relevantes").fill("https://github.com/beatriz");
  await page.getByLabel("Archivos adicionales (opcional)").setInputFiles([{ name: "certificado.pdf", mimeType: "application/pdf", buffer: Buffer.from("certificado") }]);
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByText("Candidatura registrada con éxito.")).toBeVisible();
  await page.goto("/candidates/persisted");
  const value = (label: string) => page.locator("dl > div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd");
  for (const reload of [false, true]) {
    if (reload) await page.reload();
    for (const [label, text] of [["País de residencia", "España"], ["Ciudad de residencia", "Barcelona"], ["Permiso de trabajo o visado", "Requiere patrocinio de visa"], ["Disponibilidad (en días)", "0 días"], ["Expectativa salarial neta anual en euros", "35000"], ["Fuente de reclutamiento", "LinkedIn"], ["CV", cvFile.name], ["Archivos adicionales", "certificado.pdf"]]) await expect(value(label)).toHaveText(text);
    await expect(value("Otras URLs relevantes").getByRole("link", { name: "https://github.com/beatriz" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Editar candidatura" }).click();
  await page.getByLabel("Ciudad de residencia").fill("Valencia");
  await page.getByLabel("Disponibilidad (en días)").fill("30");
  await page.getByLabel("Expectativa salarial neta anual en euros").fill("0");
  await page.getByRole("button", { name: "Eliminar adjunto certificado.pdf" }).click();
  await page.getByLabel("CV *", { exact: true }).setInputFiles(cvFile);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Candidatura actualizada con éxito.")).toBeVisible();
  await page.reload();
  await expect(value("Ciudad de residencia")).toHaveText("Valencia");
  await expect(value("Disponibilidad (en días)")).toHaveText("30 días");
  await expect(value("Expectativa salarial neta anual en euros")).toHaveText("0");
  await expect(value("Archivos adicionales")).not.toContainText("certificado.pdf");
});

test("fallo de IndexedDB tras guardar API no anuncia éxito completo", async ({ page }) => {
  await page.addInitScript(() => { indexedDB.open = () => { throw new Error("Almacenamiento denegado"); }; });
  await page.route("**/records", (route) => route.request().method() === "POST" ? route.fulfill({ status: 201, json: candidate }) : route.fallback());
  await openCreate(page);
  await fillCreate(page);
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("La API guardó la candidatura");
  await expect(page.getByText("Candidatura registrada con éxito.")).toHaveCount(0);
});

test("todos los países y nuevos campos profesionales obligatorios", async ({ page }) => {
  await openCreate(page);
  const country = page.getByLabel("País de residencia");
  await expect(country.locator("option")).toHaveCount(Object.keys(COUNTRY_LABELS).length + 1);
  expect(Object.keys(COUNTRY_LABELS).length).toBeGreaterThanOrEqual(249);
  await expect(country.locator('option[value="ES"]')).toHaveText("España");
  await expect(country.locator('option[value="JP"]')).toBeAttached();
  await expect(country.locator('option[value="XK"]')).toHaveText("Kosovo");
  for (const label of ["País de residencia", "Ciudad de residencia", "Permiso de trabajo o visado", "Disponibilidad (en días)", "Fuente de reclutamiento"]) {
    await expect(page.getByLabel(`${label} *`, { exact: true })).toHaveAttribute("required", "");
  }
  await fillCreate(page);
  await page.getByLabel("Ciudad de residencia").fill("   ");
  for (const label of ["País de residencia", "Permiso de trabajo o visado", "Fuente de reclutamiento"]) await page.getByLabel(label).selectOption("");
  await page.getByLabel("Disponibilidad (en días)").fill("");
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toHaveCount(5);
});

test("disponibilidad numérica obligatoria valida días enteros y envía número", async ({ page }) => {
  const submissions: CandidateInput[] = [];
  await page.route("**/records", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    submissions.push(readJson(route));
    return route.fulfill({ status: 201, json: candidate });
  });
  await openCreate(page);
  await fillCreate(page);
  const details = page.getByLabel("Disponibilidad (en días) *", { exact: true });
  await expect(details).toHaveAttribute("type", "number");
  await expect(details).toHaveAttribute("min", "0");
  await expect(details).toHaveAttribute("step", "1");
  await expect(details).toHaveAttribute("aria-describedby", "availability-help");
  await expect(page.getByText("Indica cuántos días necesitas para incorporarte. 0 días significa disponibilidad inmediata.")).toBeVisible();
  await expect(details).toHaveAttribute("required", "");
  await expect(page.locator('select[name="availability"]')).toHaveCount(0);
  await expect(page.getByLabel("Detalle de disponibilidad")).toHaveCount(0);
  await details.fill("");
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("Completa el campo disponibilidad");
  expect(submissions).toHaveLength(0);
  for (const invalid of ["-1", "1.5"]) {
    await details.fill(invalid);
    await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
    await expect(page.getByRole("form").getByRole("alert")).toContainText("cantidad de días entera");
    expect(submissions).toHaveLength(0);
  }
  await details.fill("15");
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByText("Candidatura registrada con éxito.")).toBeVisible();
  expect(submissions[0].availability_details).toBeNull();
  expect(submissions[0].availability).toBe(15);
});

test("URLs relevantes y archivos adicionales opcionales serializados en JSON", async ({ page }) => {
  let payload: CandidateInput | undefined;
  await page.route("**/records", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    payload = readJson(route);
    return route.fulfill({ status: 201, json: candidate });
  });
  await openCreate(page);
  await fillCreate(page);
  await page.getByLabel("Otras URLs relevantes").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByRole("form").getByRole("alert")).toContainText("URLs válidas");
  expect(payload).toBeUndefined();
  await page.getByLabel("Otras URLs relevantes").fill(" https://github.com/beatriz \nhttps://beatriz.example.com");
  const files = [
    { name: "certificado.pdf", mimeType: "application/pdf", buffer: Buffer.from("certificado") },
    { name: "recomendacion.png", mimeType: "image/png", buffer: Buffer.from("imagen") },
  ];
  await page.getByLabel("Archivos adicionales (opcional)").setInputFiles(files);
  await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
  await expect(page.getByText("Candidatura registrada con éxito.")).toBeVisible();
  expect(payload?.relevant_urls).toEqual(["https://github.com/beatriz", "https://beatriz.example.com"]);
  expect(payload?.additional_files).toEqual(files.map((file) => ({ name: file.name, type: file.mimeType, size: file.buffer.length, content_base64: file.buffer.toString("base64") })));
});

test("límites y formatos de archivos adicionales", async ({ page }) => {
  let writes = 0;
  page.on("request", (request) => { if (request.method() === "POST") writes += 1; });
  await openCreate(page);
  await fillCreate(page);
  const input = page.getByLabel("Archivos adicionales (opcional)");
  await expect(input).not.toHaveAttribute("required");
  await expect(input).toHaveAttribute("multiple", "");
  for (const files of [
    [{ name: "script.exe", mimeType: "application/octet-stream", buffer: Buffer.from("invalid") }],
    [{ name: "vacio.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(0) }],
    [{ name: "grande.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }],
    Array.from({ length: 6 }, (_, index) => ({ name: `${index}.pdf`, mimeType: "application/pdf", buffer: Buffer.from("test") })),
    Array.from({ length: 3 }, (_, index) => ({ name: `${index}.pdf`, mimeType: "application/pdf", buffer: Buffer.alloc(4 * 1024 * 1024) })),
  ]) {
    await input.evaluate((element, files) => {
      const transfer = new DataTransfer();
      for (const file of files) transfer.items.add(new File([new Uint8Array(file.size)], file.name, { type: file.type }));
      (element as HTMLInputElement).files = transfer.files;
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, files.map((file) => ({ name: file.name, type: file.mimeType, size: file.buffer.length })));
    await page.getByRole("button", { name: "Registrar candidatura", exact: true }).click();
    await expect(page.getByRole("form").getByRole("alert")).toBeVisible();
  }
  expect(writes).toBe(0);
});

test("PUT convierte disponibilidad legacy y precarga enlaces y adjuntos existentes", async ({ page }) => {
  let payload: CandidateInput | undefined;
  await page.route("**/records/candidate-1", (route) => {
    if (route.request().method() === "PUT") {
      payload = readJson(route);
      return route.fulfill({ json: candidate });
    }
    return route.fulfill({ json: { ...candidate, availability: "other", availability_details: "6 semanas", relevant_urls: ["https://github.com/ana"], additional_files: [expectedCv] } });
  });
  await page.goto("/candidates/candidate-1");
  await page.getByRole("button", { name: "Editar candidatura" }).click();
  await expect(page.getByLabel("Disponibilidad (en días)")).toHaveValue("42");
  await expect(page.getByLabel("Otras URLs relevantes")).toHaveValue("https://github.com/ana");
  await page.getByRole("button", { name: `Eliminar adjunto ${cvFile.name}` }).click();
  await page.getByLabel("CV *", { exact: true }).setInputFiles(cvFile);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Candidatura actualizada con éxito.")).toBeVisible();
  expect(payload?.additional_files).toEqual([]);
  expect(payload?.availability).toBe(42);
  expect(payload?.availability_details).toBeNull();
});

test("país aparece inmediatamente antes de ciudad en alta y edición", async ({ page }) => {
  for (const editing of [false, true]) {
    if (editing) {
      await page.goto("/candidates/candidate-1");
      await page.getByRole("button", { name: "Editar candidatura" }).click();
    } else await openCreate(page);
    const names = await page.getByRole("form").locator("input[name],select[name]").evaluateAll((elements) => elements.map((element) => element.getAttribute("name")));
    expect(names[names.indexOf("country") + 1]).toBe("location");
    await expect(page.getByLabel("Disponibilidad (en días)")).toHaveAttribute("type", "number");
  }
});

test("deserializa campos profesionales y nombres alternativos en detalle y edición", async ({ page }) => {
  const file = { fileName: "certificado.pdf", mimeType: "application/pdf", fileSize: String(expectedCv.size), contentBase64: expectedCv.content_base64 };
  const model = {
    id: candidate.id, fullName: candidate.full_name, email: candidate.email,
    phone: candidate.phone, position: candidate.position, status: candidate.status,
    stage: candidate.stage, experienceYears: 3.5, countryOfResidence: "ES",
    cityOfResidence: "Sevilla", workAuthorization: "valid_permit",
    noticePeriod: "15 días", expectedSalary: "0", recruitmentSource: "linkedin",
    relevantUrls: JSON.stringify(["https://github.com/ana", "https://ana.example.com"]),
    additionalFiles: JSON.stringify([JSON.stringify(file)]), cvFile: JSON.stringify(expectedCv),
  };
  await page.route("**/records/candidate-1", (route) => route.fulfill({ json: { data: JSON.stringify(model) } }));
  await page.goto("/candidates/candidate-1");
  const value = (label: string) => page.locator("dl > div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd");
  for (const [label, text] of [["País de residencia", "España"], ["Ciudad de residencia", "Sevilla"], ["Permiso de trabajo o visado", "Permiso de trabajo vigente"], ["Disponibilidad (en días)", "15 días"], ["Expectativa salarial neta anual en euros", "0"], ["Fuente de reclutamiento", "LinkedIn"], ["CV", cvFile.name], ["Archivos adicionales", "certificado.pdf"]]) {
    await expect(value(label)).toHaveText(text);
  }
  await expect(value("Otras URLs relevantes").getByRole("link")).toHaveCount(2);
  await page.getByRole("button", { name: "Editar candidatura" }).click();
  await expect(page.getByLabel("Ciudad de residencia")).toHaveValue("Sevilla");
  await expect(page.getByLabel("Disponibilidad (en días)")).toHaveValue("15");
  await expect(page.getByLabel("Otras URLs relevantes")).toHaveValue("https://github.com/ana\nhttps://ana.example.com");
  await expect(page.getByRole("button", { name: "Eliminar adjunto certificado.pdf" })).toBeVisible();
});

test("parser conserva cero y no inventa campos ausentes ni archivos corruptos", () => {
  const parsed = parseCandidate({ ...candidate, expected_salary: 0, relevant_urls: "not JSON", additional_files: "not JSON" });
  expect(parsed?.expected_salary).toBe(0);
  expect(parsed?.additional_files).toEqual([]);
  for (const availability of ["true", "false", "null", "Disponible a partir de enero"]) expect(parseCandidate({ ...candidate, availability })).toMatchObject({ availability: null, availability_details: availability });
  for (const [value, days] of [[0, 0], ["0", 0], ["15 días", 15], ["30 days", 30], ["1 mes", 30], ["two_weeks", 14], ["Inmediato", 0]] as const) expect(getAvailabilityDays(value)).toBe(days);
  for (const value of [null, "", -1, 1.5, "1.5", "más de 1 mes"]) expect(getAvailabilityDays(value)).toBeNull();
  expect(parseCandidate({ id: "legacy", full_name: "Legacy Candidate" })).toMatchObject({ expected_salary: null, country: null, location: null, relevant_urls: [], additional_files: [] });
  expect(parseCandidate({ data: "invalid JSON" })).toBeNull();
});

test("campos vacíos del detalle muestran exactamente No indicado sin ocultar cero", async ({ page }) => {
  for (const missing of [null, "", "   "]) {
    await page.route("**/records/candidate-1", (route) => route.fulfill({ json: {
      ...candidate, email: missing, phone: missing, position: missing,
      linkedin_url: missing, cv_url: missing, cv_file: null, country: missing,
      location: missing, work_authorization: missing, availability: missing,
      recruitment_source: missing, applied_at: missing, status: missing, stage: missing,
      relevant_urls: ["   "], additional_files: [], expected_salary: 0, experience_years: 0,
    } }));
    await page.goto("/candidates/candidate-1");
    const value = (label: string) => page.locator("dl > div").filter({ has: page.getByText(label, { exact: true }) }).locator("dd");
    for (const label of ["Email", "Teléfono", "Puesto", "LinkedIn", "CV", "País de residencia", "Ciudad de residencia", "Permiso de trabajo o visado", "Disponibilidad (en días)", "Fuente de reclutamiento", "Otras URLs relevantes", "Archivos adicionales", "Fecha de candidatura"]) await expect(value(label)).toHaveText("No indicado");
    await expect(value("Expectativa salarial neta anual en euros")).toHaveText("0");
    await expect(value("Años de experiencia")).toHaveText("0 años");
    await expect(page.locator("dl").getByText("No disponible", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Estado", { exact: true }).getByRole("option", { name: "No indicado", exact: true })).toBeAttached();
    await expect(page.getByLabel("Etapa", { exact: true }).getByRole("option", { name: "No indicado", exact: true })).toBeAttached();
  }
});

test("disponibilidad muestra unidad singular y requiere convertir textos antiguos ambiguos", async ({ page }) => {
  await page.route("**/records/candidate-1", (route) => route.fulfill({ json: { ...candidate, availability: 1 } }));
  await page.goto("/candidates/candidate-1");
  await expect(page.getByText("1 día", { exact: true })).toBeVisible();
  await page.route("**/records/candidate-1", (route) => route.fulfill({ json: { ...candidate, availability: "Disponible a partir de enero" } }));
  await page.reload();
  const availability = page.locator("dl > div").filter({ has: page.getByText("Disponibilidad (en días)", { exact: true }) }).locator("dd");
  await expect(availability).toHaveText("No indicado");
  await page.getByRole("button", { name: "Editar candidatura" }).click();
  await expect(page.getByLabel("Disponibilidad (en días)")).toHaveValue("");
  await expect(page.getByText("Dato anterior: Disponible a partir de enero. Indica su equivalente en días.")).toBeVisible();
});

test("quitar archivos limpia estado y selector antes de POST y PUT", async ({ page }) => {
  const submissions: CandidateInput[] = [];
  await page.route("**/records**", (route) => {
    if (!["POST", "PUT"].includes(route.request().method())) return route.fallback();
    submissions.push(readJson(route));
    return route.fulfill({ status: 200, json: candidate });
  });
  const attachments = [
    { name: "certificado.pdf", mimeType: "application/pdf", buffer: Buffer.from("certificado") },
    { name: "carta.doc", mimeType: "application/msword", buffer: Buffer.from("carta") },
  ];
  for (const editing of [false, true]) {
    if (editing) {
      await page.goto("/candidates/candidate-1");
      await page.getByRole("button", { name: "Editar candidatura" }).click();
      await page.getByLabel("CV *", { exact: true }).setInputFiles(cvFile);
    } else {
      await openCreate(page);
      await fillCreate(page);
    }
    const cvInput = page.getByLabel("CV *", { exact: true });
    await page.getByRole("button", { name: `Quitar CV ${cvFile.name}` }).click();
    expect(await cvInput.evaluate((input) => (input as HTMLInputElement).files?.length)).toBe(0);
    const submit = page.getByRole("button", { name: editing ? "Guardar cambios" : "Registrar candidatura", exact: true });
    await submit.click();
    await expect(page.getByRole("form").getByRole("alert")).toContainText("Selecciona un CV");
    const additionalInput = page.getByLabel("Archivos adicionales (opcional)");
    await additionalInput.setInputFiles(attachments);
    await page.getByRole("button", { name: "Quitar adjunto seleccionado certificado.pdf" }).click();
    expect(await additionalInput.evaluate((input) => Array.from((input as HTMLInputElement).files ?? []).map((file) => file.name))).toEqual(["carta.doc"]);
    await page.getByRole("button", { name: "Quitar adjunto seleccionado carta.doc" }).click();
    expect(await additionalInput.evaluate((input) => (input as HTMLInputElement).files?.length)).toBe(0);
    await cvInput.setInputFiles(cvFile);
    await submit.click();
    await expect(page.getByText(editing ? "Candidatura actualizada con éxito." : "Candidatura registrada con éxito.")).toBeVisible();
  }
  expect(submissions).toHaveLength(2);
  for (const payload of submissions) {
    expect(payload.cv_file).toEqual(expectedCv);
    expect(payload.additional_files).toEqual([]);
  }
});

test("formularios legibles en escritorio y móvil", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await openCreate(page);
    await fillCreate(page);
    await page.getByLabel("Archivos adicionales (opcional)").setInputFiles([{ name: "certificado.pdf", mimeType: "application/pdf", buffer: Buffer.from("certificado") }]);
    await expect(page.getByRole("form", { name: "Nueva candidatura" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`create-${viewport.width}.png`), fullPage: true });
    await page.goto("/candidates/candidate-1");
    await page.getByRole("button", { name: "Editar candidatura" }).click();
    await page.getByLabel("CV *", { exact: true }).setInputFiles(cvFile);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`edit-${viewport.width}.png`), fullPage: true });
  }
});