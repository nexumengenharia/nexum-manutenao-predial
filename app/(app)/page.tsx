import Link from "next/link";
import { contexto } from "@/lib/sessao";
import * as P from "@/lib/servicos/painel";
import { brl, num, dataHora, rotulo } from "@/lib/fmt";
import { Selo, Painel } from "@/components/ui";
import { Rosca, BarrasNav, Serie, Medidor, Empilhada } from "@/components/graficos";
import { IconeCategoria, catCor } from "@/components/icones";

export const dynamic = "force-dynamic";

const COR_SIT: Record<string, string> = {
  ABERTA: "#0284c7", EM_EXECUCAO: "#4f46e5", AGUARDANDO_PECA: "#d97706",
  CONCLUIDA: "#059669", CANCELADA: "#94a3b8",
};
const COR_TIPO: Record<string, string> = {
  PREVENTIVA: "#0d9488", PREDITIVA: "#7c3aed", CORRETIVA: "#e11d48", PMOC: "#0891b2",
};
const COR_PRIO: Record<string, string> = {
  URGENTE: "#dc2626", ALTA: "#ea580c", MEDIA: "#64748b", BAIXA: "#94a3b8",
};

function Delta({ atual, anterior, invertido = false }: { atual: number; anterior: number; invertido?: boolean }) {
  if (!anterior) return null;
  const pct = ((atual - anterior) / anterior) * 100;
  const sobe = pct > 0;
  const bom = invertido ? !sobe : sobe;
  if (Math.abs(pct) < 0.5) {
    return <span className="text-[11px] font-medium text-slate-400">estável</span>;
  }
  return (
    <span className={`text-[11px] font-semibold ${bom ? "text-emerald-600" : "text-red-600"}`}>
      {sobe ? "▲" : "▼"} {num(Math.abs(pct), 1)}% vs. mês anterior
    </span>
  );
}

function Kpi({ rotulo: r, valor, detalhe, tom = "neutro", href, extra }: {
  rotulo: string; valor: React.ReactNode; detalhe?: string;
  tom?: "neutro" | "bom" | "alerta" | "critico"; href?: string; extra?: React.ReactNode;
}) {
  const borda = { neutro: "border-slate-200", bom: "border-emerald-400",
                  alerta: "border-amber-400", critico: "border-red-400" }[tom];
  const cor = { neutro: "text-marinho-900", bom: "text-emerald-700",
                alerta: "text-amber-700", critico: "text-red-700" }[tom];
  const corpo = (
    <div className={`h-full rounded-xl border-l-4 bg-white p-4 shadow-sm transition
                     ${borda} ${href ? "hover:-translate-y-0.5 hover:shadow-md" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{r}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums leading-none ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-1.5 text-xs text-slate-500">{detalhe}</p>}
      {extra && <div className="mt-1.5">{extra}</div>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{corpo}</Link> : corpo;
}

export default async function PainelExecutivo() {
  const ctx = await contexto();
  const [r, tend, sit, tip, prio, mes, predios, antigas, caras, criticos, venc, equipes] =
    await Promise.all([
      P.resumoExecutivo(ctx), P.tendencia(ctx), P.porSituacao(ctx), P.porTipo(ctx),
      P.porPrioridade(ctx), P.custoPorMes(ctx), P.indicadorPredio(ctx),
      P.maisAntigas(ctx, 6), P.maisCaras(ctx, 6), P.ativosCriticos(ctx, 5),
      P.vencimentosProximos(ctx, 8), P.cargaPorEquipe(ctx),
    ]);

  const n = (v: unknown) => Number(v ?? 0);
  const hoje = new Date().toLocaleDateString("pt-BR",
    { weekday: "long", day: "2-digit", month: "long", timeZone: "America/Manaus" });

  const alertas = [
    { n: n(r?.atrasadas), t: "ordem(ns) com prazo vencido", href: "/ordens?situacao=ABERTA&atraso=1", tom: "critico" as const },
    { n: n(r?.controles_vencidos), t: "controle(s) de vencimento vencido(s)", href: "/controles?situacao=VENCIDO", tom: "critico" as const },
    { n: n(r?.solicitacoes_vencidas), t: "solicitação(ões) fora do prazo da equipe", href: "/quadro", tom: "critico" as const },
    { n: n(r?.ativos_parados), t: "ativo(s) parado(s)", href: "/ativos?situacao=PARADO", tom: "alerta" as const },
    { n: n(r?.controles_a_vencer), t: "vencimento(s) nos próximos 30 dias", href: "/controles?situacao=A_VENCER", tom: "alerta" as const },
    { n: n(r?.estoque_critico), t: "item(ns) no ponto de reposição", href: "/estoque", tom: "alerta" as const },
    { n: n(r?.contratos_vencendo), t: "contrato(s) vencendo em 90 dias", href: "/contratadas", tom: "alerta" as const },
    { n: n(r?.eventos_frota), t: "evento(s) de frota sem tratativa", href: "/frota/monitoramento", tom: "alerta" as const },
  ].filter((a) => a.n > 0);

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------- cabecalho do dia */}
      <div className="rounded-xl bg-gradient-to-r from-marinho-900 via-marinho-800 to-marinho-700 p-5 text-white shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-institucional-500">
              Central do gestor
            </p>
            <h1 className="mt-1 text-xl font-semibold">
              Bom dia, {ctx.sessao.nome.split(" ")[0]}.
            </h1>
            <p className="mt-0.5 text-sm capitalize text-white/70">{hoje}</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{num(r?.abertas)}</p>
              <p className="text-[11px] uppercase tracking-wide text-white/60">em aberto</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold tabular-nums ${n(r?.atrasadas) > 0 ? "text-red-300" : ""}`}>
                {num(r?.atrasadas)}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-white/60">atrasadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{num(r?.solicitacoes_fila)}</p>
              <p className="text-[11px] uppercase tracking-wide text-white/60">na fila</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums text-institucional-500">{num(r?.sla, 1)}%</p>
              <p className="text-[11px] uppercase tracking-wide text-white/60">SLA</p>
            </div>
          </div>
        </div>

        {alertas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/15 pt-3">
            {alertas.map((a) => (
              <Link key={a.t} href={a.href}
                className={`rounded-full px-3 py-1 text-xs font-medium transition hover:brightness-110
                  ${a.tom === "critico" ? "bg-red-500/25 text-red-100 ring-1 ring-red-400/40"
                                        : "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/40"}`}>
                <strong className="tabular-nums">{a.n}</strong> {a.t}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* -------------------------------------------------- indicadores */}
      <section aria-label="Indicadores principais"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi rotulo="Custo do mês" valor={brl(r?.custo_mes)} href="/relatorios"
             extra={<Delta atual={n(tend?.custo_atual)} anterior={n(tend?.custo_anterior)} invertido />} />
        <Kpi rotulo="Custo médio por OS" valor={brl(r?.custo_medio)}
             detalhe={`${num(r?.concluidas_total)} concluídas`} href="/relatorios" />
        <Kpi rotulo="Tempo médio" valor={`${num(r?.horas_medias, 1)} h`}
             detalhe="abertura até conclusão" href="/relatorios" />
        <Kpi rotulo="Comprometido" valor={brl(r?.custo_comprometido)}
             detalhe="estimado das ordens abertas" tom="alerta" href="/carteira" />
        <Kpi rotulo="Concluídas no mês" valor={num(r?.concluidas_mes)}
             extra={<Delta atual={n(tend?.mes_atual)} anterior={n(tend?.mes_anterior_parcial)} />}
             href="/ordens?situacao=CONCLUIDA" />
        <Kpi rotulo="Nota de qualidade" valor={`${num(r?.nota_media, 2)}`} detalhe="média da fiscalização"
             tom={n(r?.nota_media) >= 4 ? "bom" : "alerta"} href="/relatorios" />
      </section>

      {/* ---------------------------------------------------- graficos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Painel titulo="Ordens por situação">
          <Rosca centroRotulo="ordens"
            dados={sit.map((s: any) => ({
              rotulo: rotulo(s.situacao), valor: Number(s.total),
              cor: COR_SIT[s.situacao] ?? "#94a3b8",
              href: `/ordens?situacao=${s.situacao}`,
            }))} />
          <p className="mt-3 text-[11px] text-slate-500">Clique na fatia para abrir a lista filtrada.</p>
        </Painel>

        <Painel titulo="Ordens por tipo de manutenção">
          <Rosca centroRotulo="ordens"
            dados={tip.map((t: any) => ({
              rotulo: rotulo(t.tipo), valor: Number(t.total),
              cor: COR_TIPO[t.tipo] ?? "#64748b",
              href: `/ordens?tipo=${t.tipo}`,
            }))} />
          <p className="mt-3 text-[11px] text-slate-500">Clique na fatia para abrir a lista filtrada.</p>
        </Painel>

        <Painel titulo="Desempenho">
          <div className="flex flex-wrap items-center justify-around gap-4">
            <Medidor valor={n(r?.sla)} meta={90} rotulo="SLA de atendimento" />
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">Semana corrente</p>
              <p><strong className="tabular-nums text-lg text-marinho-900">{num(r?.abertas_semana)}</strong>
                 <span className="text-slate-500"> abertas</span></p>
              <p><strong className="tabular-nums text-lg text-emerald-700">{num(r?.concluidas_semana)}</strong>
                 <span className="text-slate-500"> concluídas</span></p>
              <p className={`text-xs font-medium ${n(r?.concluidas_semana) >= n(r?.abertas_semana)
                    ? "text-emerald-600" : "text-amber-600"}`}>
                {n(r?.concluidas_semana) >= n(r?.abertas_semana)
                  ? "Fila diminuindo" : "Fila crescendo"}
              </p>
            </div>
          </div>
          {prio.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Prioridade do que está aberto
              </p>
              <Empilhada partes={prio.map((p: any) => ({
                rotulo: rotulo(p.prioridade), valor: Number(p.total),
                cor: COR_PRIO[p.prioridade] ?? "#94a3b8",
                href: `/ordens?prioridade=${p.prioridade}`,
              }))} />
            </div>
          )}
        </Painel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Custo executado por mês">
          <Serie formato="moeda"
            dados={mes.map((m: any) => ({
              rotulo: m.mes.slice(5) + "/" + m.mes.slice(2, 4),
              valor: Number(m.custo),
              href: `/ordens?mes=${m.mes}`,
            }))} />
          <p className="mt-2 text-[11px] text-slate-500">
            Passe o cursor para ver o mês; clique para abrir as ordens daquele período.
          </p>
        </Painel>

        <Painel titulo="Custo médio e tempo médio por tipo">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-1.5 text-left font-semibold">Tipo</th>
                  <th className="py-1.5 text-right font-semibold">Custo médio</th>
                  <th className="py-1.5 text-right font-semibold">Tempo médio</th>
                  <th className="py-1.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tip.map((t: any) => (
                  <tr key={t.tipo} className="hover:bg-slate-50">
                    <td className="py-2">
                      <Link href={`/ordens?tipo=${t.tipo}`} className="inline-flex items-center gap-2 hover:underline">
                        <span aria-hidden className="h-2.5 w-2.5 rounded-sm"
                              style={{ background: COR_TIPO[t.tipo] ?? "#64748b" }} />
                        {rotulo(t.tipo)}
                      </Link>
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">{brl(t.custo_medio)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-600">{num(t.horas_medias, 1)} h</td>
                    <td className="py-2 text-right tabular-nums text-slate-600">{brl(t.custo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
      </div>

      {/* --------------------------------------------------- rankings */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Abertas há mais tempo"
          acao={<Link href="/carteira" className="text-xs font-medium text-marinho-700 hover:underline">Ver carteira</Link>}>
          <ol className="space-y-2">
            {antigas.map((o: any, i: number) => (
              <li key={o.id}>
                <Link href={`/ordens/${o.id}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 transition hover:border-marinho-200 hover:bg-slate-50">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold
                    ${i === 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{o.titulo}</p>
                    <p className="truncate text-xs text-slate-500">
                      {o.numero} · {o.predio}{o.ativo ? ` · ${o.ativo}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-bold tabular-nums ${o.vencida ? "text-red-600" : "text-slate-700"}`}>
                      {num(o.dias_aberta, 0)} d
                    </p>
                    {o.vencida && <p className="text-[10px] font-medium text-red-500">
                      {num(o.dias_vencida, 0)} d de atraso</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </Painel>

        <Painel titulo="Maiores custos"
          acao={<Link href="/relatorios" className="text-xs font-medium text-marinho-700 hover:underline">Relatórios</Link>}>
          <ol className="space-y-2">
            {caras.map((o: any, i: number) => (
              <li key={o.id}>
                <Link href={`/ordens/${o.id}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 transition hover:border-marinho-200 hover:bg-slate-50">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold
                    ${i === 0 ? "bg-institucional-500/20 text-institucional-600" : "bg-slate-100 text-slate-600"}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{o.titulo}</p>
                    <p className="truncate text-xs text-slate-500">
                      {o.numero} · {o.predio}{o.contratada ? ` · ${o.contratada}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-marinho-900">{brl(o.custo)}</p>
                    <p className="text-[10px] text-slate-400">{o.estimado ? "estimado" : "executado"}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </Painel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Custo por prédio"
          acao={<Link href="/predios" className="text-xs font-medium text-marinho-700 hover:underline">Ver mapa</Link>}>
          <BarrasNav formato="moeda"
            dados={predios.map((p: any) => ({
              rotulo: p.predio, valor: Number(p.custo_total),
              href: `/ordens?predio=${p.predio_id}`,
              detalhe: `${num(p.ordens)} ordens · ${num(p.em_aberto)} abertas · média ${num(p.horas_medias, 0)} h · ${brl(p.custo_medio)} por OS`,
            }))} />
        </Painel>

        <Painel titulo="Ativos que mais consomem"
          acao={<Link href="/ativos" className="text-xs font-medium text-marinho-700 hover:underline">Ver ativos</Link>}>
          <ul className="space-y-2">
            {criticos.map((a: any) => {
              const c = catCor(a.categoria);
              return (
                <li key={a.id}>
                  <Link href={`/ativos/${a.id}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 transition hover:border-marinho-200 hover:bg-slate-50">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg p-1.5"
                          style={{ background: c.bg }}>
                      <IconeCategoria categoria={a.categoria} className="block h-full w-full" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{a.nome}</p>
                      <p className="truncate text-xs text-slate-500">
                        {a.predio} · {num(a.corretivas)} corretivas de {num(a.ordens)} ordens
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums text-marinho-900">{brl(a.custo_total)}</p>
                      {a.pct_do_valor && (
                        <p className={`text-[10px] font-medium ${Number(a.pct_do_valor) > 40 ? "text-red-600" : "text-slate-400"}`}>
                          {num(a.pct_do_valor, 0)}% do valor do bem
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 rounded bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
            Ativo cujo custo acumulado passa de 40% do valor de aquisição costuma sair mais barato substituir que manter.
          </p>
        </Painel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Vencimentos e controles"
          acao={<Link href="/controles" className="text-xs font-medium text-marinho-700 hover:underline">Ver todos</Link>}>
          <ul className="divide-y divide-slate-100">
            {venc.map((v: any) => (
              <li key={v.id} className="flex items-center gap-3 py-2">
                <span className={`h-2 w-2 shrink-0 rounded-full
                  ${v.situacao === "VENCIDO" ? "bg-red-500" : "bg-amber-500"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-800">{v.nome}</p>
                  <p className="truncate text-xs text-slate-500">
                    {rotulo(v.tipo)}{v.norma ? ` · ${v.norma}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold tabular-nums
                  ${Number(v.dias) < 0 ? "text-red-600" : "text-amber-600"}`}>
                  {Number(v.dias) < 0 ? `${num(Math.abs(Number(v.dias)))} d vencido` : `em ${num(v.dias)} d`}
                </span>
              </li>
            ))}
            {venc.length === 0 && <li className="py-6 text-center text-sm text-slate-500">
              Nenhum vencimento próximo.</li>}
          </ul>
        </Painel>

        <Painel titulo="Carga por equipe"
          acao={<Link href="/quadro" className="text-xs font-medium text-marinho-700 hover:underline">Quadro de atividades</Link>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-1.5 text-left font-semibold">Equipe</th>
                  <th className="py-1.5 text-right font-semibold">Fila</th>
                  <th className="py-1.5 text-right font-semibold">Vencidas</th>
                  <th className="py-1.5 text-right font-semibold">Tempo méd.</th>
                  <th className="py-1.5 text-right font-semibold">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipes.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="py-2">
                      <Link href={`/quadro?equipe=${e.id}`} className="hover:underline">{e.nome}</Link>
                      <span className="ml-1.5 text-[10px] text-slate-400">SLA {num(e.sla_horas)}h</span>
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">{num(e.fila)}</td>
                    <td className={`py-2 text-right tabular-nums font-medium
                      ${Number(e.vencidas) > 0 ? "text-red-600" : "text-slate-400"}`}>{num(e.vencidas)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-600">
                      {e.horas_medias ? `${num(e.horas_medias, 1)} h` : "—"}</td>
                    <td className="py-2 text-right tabular-nums text-slate-600">
                      {e.nota ? num(e.nota, 1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
      </div>
    </div>
  );
}
