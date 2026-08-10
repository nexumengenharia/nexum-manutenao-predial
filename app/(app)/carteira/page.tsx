import Link from "next/link";
import { contexto } from "@/lib/sessao";
import { consultar } from "@/lib/db";
import { brl, num, dataHora, rotulo } from "@/lib/fmt";
import { Selo, Titulo, Painel } from "@/components/ui";
import { BarrasNav } from "@/components/graficos";

export const dynamic = "force-dynamic";

/** Carteira = tudo que esta aberto, com idade e dinheiro comprometido. */
export default async function Carteira({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams;
  const ctx = await contexto();
  const ordem = sp.ordenar ?? "idade";
  const filtroPredio = sp.predio ?? null;

  const sql = `
    select c.*, o.responsavel_id, u.nome as responsavel
      from manutencao.vw_carteira c
      join manutencao.ordem o on o.id = c.id
      left join manutencao.usuario u on u.id = o.responsavel_id
     where ($1::uuid is null or o.predio_id = $1::uuid)
     order by ${ordem === "custo" ? "coalesce(c.custo_estimado,0) desc"
              : ordem === "prioridade" ? "array_position(array['URGENTE','ALTA','MEDIA','BAIXA'], c.prioridade), c.dias_aberta desc"
              : "c.dias_aberta desc"}`;
  const linhas = await consultar(ctx, sql, [filtroPredio]);

  const total = linhas.reduce((s: number, l: any) => s + Number(l.custo_estimado ?? 0), 0);
  const vencidas = linhas.filter((l: any) => l.vencida);
  const porFaixa = [
    { rotulo: "Até 7 dias",      min: 0,  max: 7 },
    { rotulo: "8 a 15 dias",     min: 7,  max: 15 },
    { rotulo: "16 a 30 dias",    min: 15, max: 30 },
    { rotulo: "Mais de 30 dias", min: 30, max: 1e9 },
  ].map((f) => ({
    rotulo: f.rotulo,
    valor: linhas.filter((l: any) => Number(l.dias_aberta) > f.min && Number(l.dias_aberta) <= f.max).length,
    cor: f.max <= 7 ? "#059669" : f.max <= 15 ? "#0284c7" : f.max <= 30 ? "#d97706" : "#dc2626",
  }));

  return (
    <div className="space-y-5">
      <Titulo titulo="Carteira de serviços"
        sub="Tudo que está em aberto, ordenado pelo que mais envelhece na fila." />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { r: "Ordens em carteira", v: num(linhas.length), t: "neutro" },
          { r: "Fora do prazo", v: num(vencidas.length), t: vencidas.length ? "critico" : "bom" },
          { r: "Valor comprometido", v: brl(total), t: "alerta" },
          { r: "Idade média", v: `${num(linhas.reduce((s: number, l: any) => s + Number(l.dias_aberta), 0) / (linhas.length || 1), 1)} d`, t: "neutro" },
        ].map((k) => (
          <div key={k.r} className={`rounded-xl border-l-4 bg-white p-4 shadow-sm
            ${k.t === "critico" ? "border-red-400" : k.t === "alerta" ? "border-amber-400"
              : k.t === "bom" ? "border-emerald-400" : "border-slate-200"}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{k.r}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${k.t === "critico" ? "text-red-700"
              : k.t === "alerta" ? "text-amber-700" : k.t === "bom" ? "text-emerald-700" : "text-marinho-900"}`}>
              {k.v}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Painel titulo="Envelhecimento da carteira">
          <BarrasNav formato="numero" dados={porFaixa} />
          <p className="mt-3 text-[11px] text-slate-500">
            Ordem que passa de 30 dias em aberto raramente volta ao prazo sem intervenção do gestor.
          </p>
        </Painel>

        <div className="lg:col-span-2">
          <Painel titulo="Ordenação"
            acao={
              <div className="flex gap-1">
                {[["idade","Mais antigas"],["custo","Maior custo"],["prioridade","Prioridade"]].map(([k,l]) => (
                  <Link key={k} href={`/carteira?ordenar=${k}`}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition
                      ${ordem === k ? "bg-marinho-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {l}
                  </Link>
                ))}
              </div>
            }>
            <p className="text-sm text-slate-600">
              {linhas.length} ordem(ns) aberta(s){filtroPredio ? " no prédio selecionado" : ""}.
              {vencidas.length > 0 && <> <strong className="text-red-600">{vencidas.length}</strong> já passaram do prazo.</>}
            </p>
          </Painel>
        </div>
      </div>

      <div className="space-y-2">
        {linhas.map((o: any) => (
          <Link key={o.id} href={`/ordens/${o.id}`}
            className={`block rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md
              ${o.vencida ? "border-l-4 border-l-red-500 border-slate-200" : "border-slate-200"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{o.numero}</span>
                  <Selo v={o.tipo} /><Selo v={o.situacao} /><Selo v={o.prioridade} />
                  {o.vencida && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      {num(o.dias_vencida, 0)} dias de atraso
                    </span>
                  )}
                </div>
                <p className="mt-1.5 font-medium text-slate-800">{o.titulo}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {o.predio}{o.setor ? ` · ${o.setor}` : ""}{o.ativo ? ` · ${o.ativo}` : ""}
                  {o.contratada ? ` · ${o.contratada}` : ""}
                  {o.responsavel ? ` · resp. ${o.responsavel}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold tabular-nums text-marinho-900">{brl(o.custo_estimado)}</p>
                <p className="text-xs text-slate-500">aberta há {num(o.dias_aberta, 0)} dias</p>
                <p className="text-[11px] text-slate-400">prazo {dataHora(o.prazo_em)}</p>
              </div>
            </div>
            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${o.vencida ? "bg-red-500" : "bg-marinho-600"}`}
                   style={{ width: `${Math.min(100, (Number(o.dias_aberta) / 45) * 100)}%` }} />
            </div>
          </Link>
        ))}
        {linhas.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-500">
            Nenhuma ordem em aberto. Carteira zerada.
          </p>
        )}
      </div>
    </div>
  );
}
