import Link from "next/link";
import { brl, num, rotulo } from "@/lib/fmt";

export function Cartao({ titulo, valor, detalhe, tom = "neutro", href }: {
  titulo: string; valor: React.ReactNode; detalhe?: string;
  tom?: "neutro" | "alerta" | "critico" | "bom"; href?: string;
}) {
  const tons = {
    neutro:  "border-slate-200",
    bom:     "border-emerald-300",
    alerta:  "border-amber-300",
    critico: "border-red-300",
  } as const;
  const corValor = {
    neutro: "text-marinho-800", bom: "text-emerald-700",
    alerta: "text-amber-700", critico: "text-red-700",
  } as const;

  const conteudo = (
    <div className={`h-full rounded-lg border-l-4 bg-white p-4 shadow-sm ${tons[tom]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${corValor[tom]}`}>{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-slate-500">{detalhe}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{conteudo}</Link> : conteudo;
}

const CORES: Record<string, string> = {
  ABERTA: "bg-sky-100 text-sky-800 ring-sky-600/20",
  TRIAGEM: "bg-sky-100 text-sky-800 ring-sky-600/20",
  EM_EXECUCAO: "bg-indigo-100 text-indigo-800 ring-indigo-600/20",
  AGUARDANDO_PECA: "bg-amber-100 text-amber-800 ring-amber-600/20",
  CONCLUIDA: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  CONVERTIDA: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  CANCELADA: "bg-slate-200 text-slate-600 ring-slate-500/20",
  URGENTE: "bg-red-100 text-red-800 ring-red-600/20",
  ALTA: "bg-orange-100 text-orange-800 ring-orange-600/20",
  MEDIA: "bg-slate-100 text-slate-700 ring-slate-500/20",
  BAIXA: "bg-slate-100 text-slate-500 ring-slate-400/20",
  PREVENTIVA: "bg-teal-100 text-teal-800 ring-teal-600/20",
  PREDITIVA: "bg-violet-100 text-violet-800 ring-violet-600/20",
  CORRETIVA: "bg-rose-100 text-rose-800 ring-rose-600/20",
  PMOC: "bg-cyan-100 text-cyan-900 ring-cyan-600/20",
  OPERANTE: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  EM_MANUTENCAO: "bg-amber-100 text-amber-800 ring-amber-600/20",
  PARADO: "bg-red-100 text-red-800 ring-red-600/20",
  BAIXADO: "bg-slate-200 text-slate-600 ring-slate-500/20",
  PAGA: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  ATESTADA: "bg-teal-100 text-teal-800 ring-teal-600/20",
  FECHADA: "bg-indigo-100 text-indigo-800 ring-indigo-600/20",
  GLOSADA: "bg-red-100 text-red-800 ring-red-600/20",
};

export function Selo({ v }: { v: string | null | undefined }) {
  if (!v) return <span className="text-slate-400">—</span>;
  const cor = CORES[v] ?? "bg-slate-100 text-slate-700 ring-slate-500/20";
  return (
    <span className={`inline-flex whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cor}`}>
      {rotulo(v)}
    </span>
  );
}

export function Tabela({ cols, children, vazio }: {
  cols: string[]; children: React.ReactNode; vazio?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {cols.map((c) => (
              <th key={c} scope="col"
                  className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {vazio ? (
            <tr><td colSpan={cols.length} className="px-3 py-10 text-center text-slate-500">
              Nenhum registro encontrado.
            </td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

export const Td = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-2.5 align-middle ${className}`}>{children ?? <span className="text-slate-400">—</span>}</td>
);

export function Titulo({ titulo, sub, acao }: { titulo: string; sub?: string; acao?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-marinho-900">{titulo}</h1>
        {sub && <p className="mt-0.5 text-sm text-slate-600">{sub}</p>}
      </div>
      {acao}
    </div>
  );
}

/** Barra horizontal simples — sem dependencia de biblioteca de grafico. */
export function Barras({ dados, formato = "moeda" }: {
  dados: { rotulo: string; valor: number; detalhe?: string }[];
  formato?: "moeda" | "numero";
}) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  const fmt = formato === "moeda" ? brl : (v: number) => num(v);
  return (
    <ul className="space-y-2">
      {dados.map((d) => (
        <li key={d.rotulo}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{d.rotulo}</span>
            <span className="shrink-0 font-medium tabular-nums text-slate-900">{fmt(d.valor)}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-marinho-600"
                 style={{ width: `${Math.max((d.valor / max) * 100, 1.5)}%` }}
                 role="img" aria-label={`${d.rotulo}: ${fmt(d.valor)}`} />
          </div>
          {d.detalhe && <p className="mt-0.5 text-xs text-slate-500">{d.detalhe}</p>}
        </li>
      ))}
    </ul>
  );
}

export function Painel({ titulo, children, acao }: {
  titulo: string; children: React.ReactNode; acao?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export const Campo = ({ rotulo: r, children }: { rotulo: string; children: React.ReactNode }) => (
  <div>
    <dt className="text-xs uppercase tracking-wide text-slate-500">{r}</dt>
    <dd className="mt-0.5 text-sm text-slate-800">{children ?? "—"}</dd>
  </div>
);
