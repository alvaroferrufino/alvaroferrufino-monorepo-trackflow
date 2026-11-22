const apiOrigin = new URL(window.location.origin);
if (["localhost", "127.0.0.1"].includes(apiOrigin.hostname)) {
  apiOrigin.protocol = "http:";
  apiOrigin.hostname = "localhost";
  apiOrigin.port = "8000";
} else if (apiOrigin.hostname.endsWith(".app.github.dev")) {
  apiOrigin.hostname = apiOrigin.hostname.replace(/-3000(?=\.app\.github\.dev$)/, "-8000");
} else {
  apiOrigin.port = "8000";
}
const API_URL = `${apiOrigin.origin}/api/incidents`;

const categoryLabels = {
  entrega_fallida: "Entrega fallida",
  paquete_perdido: "Paquete perdido",
  direccion_incorrecta: "Dirección incorrecta",
  devolucion: "Devolución",
  inventario_stock: "Inventario / stock",
  consulta_seguimiento: "Consulta de seguimiento",
};
const statusLabels = {
  abierto: "Abierto",
  cerrado: "Cerrado",
  descartado: "Descartado",
};
const errorLabels = {
  missing_required_field: "Campos obligatorios vacíos",
  invalid_date_format: "Fechas inválidas",
  invalid_warehouse_or_type: "Almacén o tipo de cliente inválido",
  invalid_category: "Categorías inválidas",
  invalid_status: "Estados inválidos",
  invalid_satisfaction_score: "Puntuaciones inválidas",
};

const element = (id) => document.getElementById(id);
const fileInput = element("file-input");
const dropZone = element("drop-zone");
const selectButton = element("select-button");
const downloadButton = element("download-button");
let analysisId = null;
let busy = false;

function showError(message) {
  element("error-text").textContent = message;
  element("error-banner").hidden = false;
}

function clearError() {
  element("error-banner").hidden = true;
  element("error-text").textContent = "";
}

function setBusy(value) {
  busy = value;
  selectButton.disabled = value;
  fileInput.disabled = value;
  downloadButton.disabled = value || !analysisId;
  dropZone.setAttribute("aria-busy", String(value));
  element("drop-title").textContent = value
    ? "Analizando archivo..."
    : "Arrastra tu archivo aquí";
  element("drop-subtitle").textContent = value
    ? "Espera un momento"
    : "o selecciona un archivo desde tu equipo";
}

async function responseError(response) {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
  } catch {}
  return `La operación no se pudo completar (HTTP ${response.status}).`;
}

function renderRows(target, values, labels, total, isStatus) {
  const rows = element(target);
  rows.replaceChildren();
  for (const [key, count] of Object.entries(values)) {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const name = document.createElement("span");
    name.textContent = labels[key] || key;
    if (isStatus) name.className = `state-label state-${key}`;
    nameCell.append(name);
    const countCell = document.createElement("td");
    countCell.textContent = count.toLocaleString("es-ES");
    const distributionCell = document.createElement("td");
    const distribution = document.createElement("div");
    distribution.className = "distribution";
    const percentage = total ? (count / total) * 100 : 0;
    const bar = document.createElement("span");
    bar.className = "bar";
    const fill = document.createElement("span");
    fill.className = "bar-fill";
    fill.style.width = `${percentage}%`;
    bar.append(fill);
    const label = document.createElement("span");
    label.textContent = `${percentage.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%`;
    distribution.append(bar, label);
    distributionCell.append(distribution);
    row.append(nameCell, countCell, distributionCell);
    rows.append(row);
  }
}

function renderResult(result, filename) {
  const {
    summary,
    errors,
    categories,
    statuses,
    closed_satisfaction_average: average,
  } = result;
  element("total-value").textContent = summary.total.toLocaleString("es-ES");
  element("valid-value").textContent = summary.valid.toLocaleString("es-ES");
  element("invalid-value").textContent =
    summary.invalid.toLocaleString("es-ES");
  element("satisfaction-value").textContent =
    average === null
      ? "—"
      : average.toLocaleString("es-ES", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  element("satisfaction-scale").hidden = average === null;
  renderRows("category-rows", categories, categoryLabels, summary.valid, false);
  renderRows("status-rows", statuses, statusLabels, summary.valid, true);

  const invalidBanner = element("invalid-banner");
  invalidBanner.hidden = summary.invalid === 0;
  element("warning-title").textContent =
    `${summary.invalid.toLocaleString("es-ES")} ${summary.invalid === 1 ? "registro requiere" : "registros requieren"} revisión`;
  const errorBreakdown = element("error-breakdown");
  errorBreakdown.replaceChildren();
  for (const [key, count] of Object.entries(errors)) {
    if (!count) continue;
    const item = document.createElement("li");
    item.textContent = `${errorLabels[key] || key}: ${count.toLocaleString("es-ES")}`;
    errorBreakdown.append(item);
  }
  const status = element("analysis-status");
  status.classList.add("ready");
  status.lastChild.textContent = " Análisis completado";
  element("file-status").querySelector("span").textContent =
    `Último archivo analizado: ${filename}`;
  analysisId = result.analysis_id;
}

async function analyze(file) {
  if (!file || busy) return;
  clearError();
  setBusy(true);
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(await responseError(response));
    const result = await response.json();
    if (typeof result.analysis_id !== "string" || !result.analysis_id) {
      throw new Error("La API no ha devuelto un identificador de análisis válido.");
    }
    renderResult(result, file.name);
  } catch (error) {
    showError(
      error instanceof TypeError
        ? `No se puede conectar con la API. Comprueba que esté disponible en ${apiOrigin.origin}.`
        : error.message,
    );
  } finally {
    fileInput.value = "";
    setBusy(false);
  }
}

async function download() {
  if (!analysisId || busy) return;
  clearError();
  setBusy(true);
  try {
    const response = await fetch(`${API_URL}/results/export`, {
      headers: { "X-Analysis-ID": analysisId },
    });
    if (!response.ok) throw new Error(await responseError(response));
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "results.csv";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    showError(
      error instanceof TypeError
        ? `No se puede conectar con la API. Comprueba que esté disponible en ${apiOrigin.origin}.`
        : error.message,
    );
  } finally {
    setBusy(false);
  }
}

selectButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => analyze(fileInput.files[0]));
downloadButton.addEventListener("click", download);
element("dismiss-error").addEventListener("click", clearError);
for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    if (!busy) dropZone.classList.add("dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
}
dropZone.addEventListener("drop", (event) =>
  analyze(event.dataTransfer.files[0]),
);
if (window.lucide) window.lucide.createIcons();
