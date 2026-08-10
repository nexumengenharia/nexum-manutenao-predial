export const brl = (v: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(Number(v ?? 0));

export const num = (v: unknown, casas = 0) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })
    .format(Number(v ?? 0));

export const data = (v: unknown) =>
  v ? new Date(v as string).toLocaleDateString("pt-BR", { timeZone: "America/Belem" }) : "—";

export const dataHora = (v: unknown) =>
  v ? new Date(v as string).toLocaleString("pt-BR", { timeZone: "America/Belem", dateStyle: "short", timeStyle: "short" }) : "—";

export const rotulo = (s: string | null | undefined) =>
  (s ?? "").replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
