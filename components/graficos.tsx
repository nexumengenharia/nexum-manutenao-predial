"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { brl, num } from "@/lib/fmt";

/* ------------------------------------------------------------------
   Graficos em SVG puro, sem biblioteca externa.
   Motivo: R9 (roda offline em servidor do orgao), bundle menor e
   controle total do visual. Todo grafico e navegavel por teclado e
   tem descricao textual — eMAG/WCAG exige que a informacao nao
   dependa so da cor nem so do desenho.
------------------------------------------------------------------- */

export type Fatia = { rotulo: string; valor: number; cor: string; href?: string };

const fmtValor = (v: number, formato: Formato) =>
  formato === "moeda" ? brl(v) : formato === "horas" ? `${num(v, 1)} h` : num(v);

type Formato = "moeda" | "numero" | "horas";

/* ============================================================ Rosca */
export function Rosca({
  dados, titulo, formato = "numero", centroRotulo,
}: {
  dados: Fatia[]; titulo?: string; formato?: Formato; centroRotulo?: string;
}) {
  const router = useRouter();
  const [ativo, setAtivo] = useState<number | null>(null);
  const total = dados.reduce((s, d) => s + d.valor, 0);
  if (total <= 0) {
    return <p className="py-10 text-center text-sm text-slate-500">Sem dados no período.</p>;
  }

  const R = 62, r = 38, cx = 80, cy = 80;
  let acumulado = 0;

  const arcos = dados.map((d, i) => {
    const inicio = (acumulado / total) * Math.PI * 2 - Math.PI / 2;
    acumulado += d.valor;
    const fim = (acumulado / total) * Math.PI * 2 - Math.PI / 2;
    const grande = fim - inicio > Math.PI ? 1 : 0;
    const destaque = ativo === i;
    const raio = destaque ? R + 4 : R;
    const p = (ang: number, rad: number) => `${cx + Math.cos(ang) * rad} ${cy + Math.sin(ang) * rad}`;
    const d0 = [
      `M ${p(inicio, raio)}`,
      `A ${raio} ${raio} 0 ${grande} 1 ${p(fim, raio)}`,
      `L ${p(fim, r)}`,
      `A ${r} ${r} 0 ${grande} 0 ${p(inicio, r)}`,
      "Z",
    ].join(" ");
    return { ...d, d: d0, i, pct: (d.valor / total) * 100 };
  });

  const ir = (href?: string) => { if (href) router.push(href); };

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" role="img"
           aria-label={titulo ?? "Distribuição"}>
        {arcos.map((a) => (
          <path key={a.rotulo} d={a.d} fill={a.cor}
            className={`transition-all duration-200 ${a.href ? "cursor-pointer" : ""}`}
            opacity={ativo === null || ativo === a.i ? 1 : 0.35}
            onMouseEnter={() => setAtivo(a.i)} onMouseLeave={() => setAtivo(null)}
            onClick={() => ir(a.href)} />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle"
              className="fill-marinho-900 text-[19px] font-semibold">
          {ativo !== null ? num(arcos[ativo]!.valor) : num(total)}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" className="fill-slate-500 text-[8px] uppercase tracking-wider">
          {ativo !== null ? `${num(arcos[ativo]!.pct, 1)}%` : (centroRotulo ?? "total")}
        </text>
      </svg>

      <ul className="w-full space-y-1">
        {arcos.map((a) => (
          <li key={a.rotulo}>
            <button type="button" disabled={!a.href}
              onMouseEnter={() => setAtivo(a.i)} onMouseLeave={() => setAtivo(null)}
              onClick={() => ir(a.href)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition
                ${a.href ? "hover:bg-slate-100" : "cursor-default"}
                ${ativo === a.i ? "bg-slate-100" : ""}`}>
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: a.cor }} />
              <span className="min-w-0 flex-1 truncate text-slate-700">{a.rotulo}</span>
              <span className="shrink-0 tabular-nums font-medium text-slate-900">{fmtValor(a.valor, formato)}</span>
              <span className="w-12 shrink-0 text-right tabular-nums text-xs text-slate-500">
                {num(a.pct, 1)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ==================================================== Barras clicaveis */
export function BarrasNav({
  dados, formato = "moeda", detalhe,
}: {
  dados: { rotulo: string; valor: number; href?: string; detalhe?: string; cor?: string }[];
  formato?: Formato; detalhe?: string;
}) {
  const router = useRouter();
  const max = Math.max(...dados.map((d) => d.valor), 1);
  if (!dados.length) return <p className="py-8 text-center text-sm text-slate-500">Sem dados.</p>;

  return (
    <ul className="space-y-2.5">
      {dados.map((d) => {
        const conteudo = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-slate-700 group-hover:text-marinho-800">{d.rotulo}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                {fmtValor(d.valor, formato)}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                   style={{ width: `${Math.max((d.valor / max) * 100, 2)}%`, background: d.cor ?? "#1e3a5f" }} />
            </div>
            {d.detalhe && <p className="mt-1 text-xs text-slate-500">{d.detalhe}</p>}
          </>
        );
        return (
          <li key={d.rotulo}>
            {d.href ? (
              <button type="button" onClick={() => router.push(d.href!)}
                className="group w-full rounded px-1 py-0.5 text-left hover:bg-slate-50">
                {conteudo}
              </button>
            ) : (
              <div className="px-1 py-0.5">{conteudo}</div>
            )}
          </li>
        );
      })}
      {detalhe && <li className="pt-1 text-xs text-slate-500">{detalhe}</li>}
    </ul>
  );
}

/* ======================================================= Serie temporal */
export function Serie({
  dados, formato = "moeda", altura = 150,
}: {
  dados: { rotulo: string; valor: number; secundario?: number; href?: string }[];
  formato?: Formato; altura?: number;
}) {
  const router = useRouter();
  const [ativo, setAtivo] = useState<number | null>(null);
  if (!dados.length) return <p className="py-8 text-center text-sm text-slate-500">Sem dados.</p>;

  const max = Math.max(...dados.map((d) => d.valor), 1);
  const L = 8, T = 8, W = 100, H = altura;
  const passo = (W - L * 2) / Math.max(dados.length - 1, 1);
  const y = (v: number) => T + (1 - v / max) * (H - T * 2 - 22);
  const pts = dados.map((d, i) => `${L + i * passo},${y(d.valor)}`).join(" ");
  const area = `${L},${H - 22} ${pts} ${L + (dados.length - 1) * passo},${H - 22}`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none"
           style={{ height: altura }} role="img" aria-label="Evolução no período">
        <defs>
          <linearGradient id="grad-serie" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#grad-serie)" />
        <polyline points={pts} fill="none" stroke="#1e3a5f" strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {dados.map((d, i) => (
          <g key={d.rotulo}>
            <circle cx={L + i * passo} cy={y(d.valor)} r={ativo === i ? 2.6 : 1.5}
              fill={ativo === i ? "#b8860b" : "#1e3a5f"} className="transition-all" />
            <rect x={L + i * passo - passo / 2} y={0} width={passo} height={H}
              fill="transparent" className={d.href ? "cursor-pointer" : ""}
              onMouseEnter={() => setAtivo(i)} onMouseLeave={() => setAtivo(null)}
              onClick={() => d.href && router.push(d.href)} />
          </g>
        ))}
      </svg>
      <div className="-mt-1 flex items-center justify-between text-[11px] text-slate-500">
        <span>{dados[0]!.rotulo}</span>
        <span className="font-medium text-marinho-800">
          {ativo !== null
            ? `${dados[ativo]!.rotulo}: ${fmtValor(dados[ativo]!.valor, formato)}`
            : `Máx. ${fmtValor(max, formato)}`}
        </span>
        <span>{dados[dados.length - 1]!.rotulo}</span>
      </div>
    </div>
  );
}

/* ============================================================ Medidor */
export function Medidor({
  valor, meta = 90, rotulo,
}: { valor: number; meta?: number; rotulo: string }) {
  const pct = Math.max(0, Math.min(100, valor));
  const R = 52, cx = 70, cy = 62;
  const ang = (p: number) => Math.PI * (1 - p / 100);
  const ponto = (p: number, rad = R) => `${cx + Math.cos(ang(p)) * rad} ${cy - Math.sin(ang(p)) * rad}`;
  const cor = pct >= meta ? "#047857" : pct >= meta - 10 ? "#b45309" : "#b91c1c";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 78" className="h-20 w-36" role="img"
           aria-label={`${rotulo}: ${num(pct, 1)} por cento, meta ${meta} por cento`}>
        <path d={`M ${ponto(0)} A ${R} ${R} 0 0 1 ${ponto(100)}`}
              fill="none" stroke="#e2e8f0" strokeWidth="11" strokeLinecap="round" />
        <path d={`M ${ponto(0)} A ${R} ${R} 0 ${pct > 50 ? 1 : 0} 1 ${ponto(pct)}`}
              fill="none" stroke={cor} strokeWidth="11" strokeLinecap="round" />
        <line x1={cx + Math.cos(ang(meta)) * (R - 8)} y1={cy - Math.sin(ang(meta)) * (R - 8)}
              x2={cx + Math.cos(ang(meta)) * (R + 8)} y2={cy - Math.sin(ang(meta)) * (R + 8)}
              stroke="#0d1b2c" strokeWidth="1.6" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-marinho-900 text-[21px] font-bold">
          {num(pct, 1)}%
        </text>
      </svg>
      <p className="-mt-1 text-xs font-medium text-slate-600">{rotulo}</p>
      <p className="text-[11px] text-slate-400">meta {meta}%</p>
    </div>
  );
}

/* ====================================================== Barra empilhada */
export function Empilhada({ partes }: { partes: Fatia[] }) {
  const router = useRouter();
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1;
  return (
    <div>
      <div className="flex h-7 w-full overflow-hidden rounded-md">
        {partes.map((p) => (
          <button key={p.rotulo} type="button" title={`${p.rotulo}: ${num(p.valor)}`}
            onClick={() => p.href && router.push(p.href)}
            style={{ width: `${(p.valor / total) * 100}%`, background: p.cor }}
            className="group relative transition hover:brightness-110">
            {p.valor / total > 0.08 && (
              <span className="text-[11px] font-semibold text-white">{num(p.valor)}</span>
            )}
          </button>
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {partes.map((p) => (
          <li key={p.rotulo} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: p.cor }} />
            {p.rotulo} <span className="font-medium text-slate-800">{num(p.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
