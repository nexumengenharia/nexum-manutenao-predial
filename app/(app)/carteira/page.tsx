import Link from "next/link";
import { contexto } from "@/lib/sessao";
import { consultar } from "@/lib/db";
import { brl, num } from "@/lib/fmt";
import { Titulo, Painel } from "@/components/ui";
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

      <Painel titulo="Ver a lista de ordens">
        <p className="text-sm text-slate-600">
          Para trabalhar as ordens em andamento, use a aba{" "}
          <Link href="/solicitacoes" className="font-semibold text-marinho-700 hover:underline">
            Execução de serviços
          </Link>
          . Para auditar a lista completa (concluídas e canceladas inclusive), abra{" "}
          <Link href="/ordens?atraso=1" className="font-semibold text-marinho-700 hover:underline">
            Ordens de serviço filtradas por atraso
          </Link>.
        </p>
      </Painel>
    </div>
  );
}
