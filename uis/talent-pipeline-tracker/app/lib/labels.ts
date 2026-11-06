export const STATUS_LABELS: Record<string, string> = {
  received: "Recibida",
  in_progress: "En proceso",
  selected: "Seleccionada",
  discarded: "Descartada",
};

export const STAGE_LABELS: Record<string, string> = {
  pending: "Pendiente de revisión",
  review: "En revisión",
  personal_interview: "Entrevista personal",
  technical_interview: "Entrevista técnica",
  offer_presented: "Oferta presentada",
  completed: "Concluida",
};

export function getLabel(labels: Record<string, string>, value: string, fallback: string) {
  return Object.hasOwn(labels, value) ? labels[value] : fallback;
}

export function isTerminalStatus(status: string) {
  return ["selected", "discarded", "hired", "rejected", "seleccionada", "descartada"].includes(status.trim().toLowerCase());
}

export function getStageValue(candidate: { status: string; stage: string }) {
  return isTerminalStatus(candidate.status) ? "completed" : candidate.stage;
}

export function getStageLabel(candidate: { status: string; stage: string }) {
  return getLabel(STAGE_LABELS, getStageValue(candidate), "Etapa desconocida");
}
