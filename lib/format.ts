const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function formatDate(ms: number): string {
  return dateFormat.format(ms);
}

export function formatDateTime(ms: number): string {
  return dateTimeFormat.format(ms);
}

export function formatAppeal(appeal: number): string {
  return appeal === 1 ? "1 pessoa" : `${appeal} pessoas`;
}
