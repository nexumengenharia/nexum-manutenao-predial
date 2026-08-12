import Link from "next/link";
import { contexto } from "@/lib/sessao";
import { consultar } from "@/lib/db";
import { brl, num, data, rotulo } from "@/lib/fmt";
import { Titulo, Painel } from "@/components/ui";
import { Rosca } from "@/components/graficos";
import { pode } from "@/lib/auth";
import NovoControle from "./novo";

export const dynamic = "force-dynamic";

const COR_SIT: Record<string, { c: string; b: string; t: string }> = {
  VENCIDO:  { c: "#dc2626", b: "border-l-red-500",     t: "bg-red-50 text-red-700" },
  A_VENCER: { c: "#d97706", b: "border-l-amber-500",   t: "bg-amber-50 text-amber-700" },
  VIGENTE:  { c: "#059669", b: "border-l-emerald-500", t: "bg-emerald-50 text-emerald-700" },
  SUSPENSO: { c: "#64748b", b: "border-l-slate-400",   t: "bg-slate-100 text-slate-600" },
  ENCERRADO:{ c: "#94a3b8", b: "border-l-slate-300",   t: "bg-slate-100 text-slate-500" },
};

export default async function Controles({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams;
  const ctx = await contexto();
  const sit = sp.situacao ?? null;
  const tipo = sp.tipo ?? null;

  const [linhas, resumo, tipos, ativos, predios, contratadas, veiculos, pontos] = await Promise.all([
    consultar(ctx, `
      select c.id, c.nome, c.tipo, c.norma, c.periodicidade_meses, c.ultima_data,
             c.proxima_data, c.situacao, c.custo_previsto, c.gera_ordem,
             (c.proxima_data - current_date) as dias,
             coalesce(a.nome, v.placa, ct.razao_social, p.nome) as alvo,
             case when a.id is not null then 'Ativo' when v.id is not null then 'Veículo'
                  when ct.id is not null then 'Contratada' else 'Prédio' end as alvo_tipo,
             a.id as ativo_id, v.id as veiculo_id,
             pa.nome as predio,
             (select count(*) from manutencao.controle_evento ce
               where ce.controle_id = c.id and ce.excluido_em is null) as renovacoes
        from manutencao.controle c
        left join manutencao.ativo a on a.id = c.ativo_id
        left join manutencao.predio pa on pa.id = a.predio_id
        left join manutencao.veiculo v on v.id = c.veiculo_id
        left join manutencao.contratada ct on ct.id = c.contratada_id
        left join manutencao.predio p on p.id = c.predio_id
       where c.excluido_em is null and c.tenant_id = manutencao.tenant_atual()
         and ($1::text is null or c.situacao = $1::text)
         and ($2::text is null or c.tipo = $2::text)
       order by c.proxima_data asc`, [sit, tipo]),
    consultar(ctx, `select situacao, count(*)::int as total,
                           coalesce(sum(custo_previsto),0) as custo
                      from manutencao.controle
                     where excluido_em is null and tenant_id = manutencao.tenant_atual()
                     group by 1`),
    consultar(ctx, `select tipo, count(*)::int as total from manutencao.controle
                     where excluido_em is null and tenant_id = manutencao.tenant_atual()
                     group by 1 order by 2 desc`),
    consultar(ctx, `select id, nome from manutencao.ativo
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
    consultar(ctx, `select id, nome from manutencao.predio
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
    consultar(ctx, `select id, razao_social as nome from manutencao.contratada
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by razao_social`),
    consultar(ctx, `select id, placa as nome from manutencao.veiculo
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by placa`),
    consultar(ctx, `select id, nome from manutencao.ponto
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
  ]);

  const porSit = (k: string) => Number(resumo.find((r: any) => r.situacao === k)?.total ?? 0);
  const custoVencido = Number(resumo.find((r: any) => r.situacao === "VENCIDO")?.custo ?? 0);
  const custoAVencer = Number(resumo.find((r: any) => r.situacao === "A_VENCER")?.custo ?? 0);

  return (
    <div className="space-y-5">
      <Titulo titulo="Controles e vencimentos"
        sub="Tudo que tem data limite: recarga de extintor, teste hidrostático, potabilidade, licenciamento, seguro e vigência contratual."
        acao={pode(ctx.sessao.papel, "cadastro.editar") && (
          <NovoControle ativos={ativos as any} predios={predios as any}
                        contratadas={contratadas as any} veiculos={veiculos as any} pontos={pontos as any} />
        )} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { r: "Vencidos", v: porSit("VENCIDO"), t: "critico", h: "/controles?situacao=VENCIDO" },
          { r: "A vencer", v: porSit("A_VENCER"), t: "alerta", h: "/controles?situacao=A_VENCER" },
          { r: "Vigentes", v: porSit("VIGENTE"), t: "bom", h: "/controles?situacao=VIGENTE" },
          { r: "Custo a provisionar", v: brl(custoVencido + custoAVencer), t: "neutro", h: "/controles" },
        ].map((k) => (
          <Link key={k.r} href={k.h}
            className={`rounded-xl border-l-4 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md
              ${k.t === "critico" ? "border-red-400" : k.t === "alerta" ? "border-amber-400"
                : k.t === "bom" ? "border-emerald-400" : "border-slate-200"}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{k.r}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${k.t === "critico" ? "text-red-700"
              : k.t === "alerta" ? "text-amber-700" : k.t === "bom" ? "text-emerald-700" : "text-marinho-900"}`}>
              {typeof k.v === "number" ? num(k.v) : k.v}
            </p>
          </Link>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Painel titulo="Situação dos controles">
          <Rosca centroRotulo="controles"
            dados={resumo.map((r: any) => ({
              rotulo: rotulo(r.situacao), valor: Number(r.total),
              cor: COR_SIT[r.situacao]?.c ?? "#94a3b8",
              href: `/controles?situacao=${r.situacao}`,
            }))} />
        </Painel>

        <div className="lg:col-span-2">
          <Painel titulo="Filtrar por tipo de controle">
            <div className="flex flex-wrap gap-1.5">
              <Link href="/controles"
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition
                  ${!tipo ? "bg-marinho-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                Todos
              </Link>
              {tipos.map((t: any) => (
                <Link key={t.tipo} href={`/controles?tipo=${t.tipo}${sit ? `&situacao=${sit}` : ""}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition
                    ${tipo === t.tipo ? "bg-marinho-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {rotulo(t.tipo)} <span className="tabular-nums opacity-70">{t.total}</span>
                </Link>
              ))}
            </div>
            <p className="mt-4 rounded bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Um <strong>controle</strong> vigia uma data limite; um <strong>plano</strong> repete uma
              rotina. São coisas diferentes: a recarga do extintor vence, a inspeção do elevador repete.
              Por isso os dois convivem no sistema em vez de um substituir o outro.
            </p>
          </Painel>
        </div>
      </div>

      <div className="space-y-2">
        {linhas.map((c: any) => {
          const s = COR_SIT[c.situacao] ?? COR_SIT.VIGENTE!;
          const dias = Number(c.dias);
          return (
            <div key={c.id}
              className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${s.b}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${s.t}`}>
                      {rotulo(c.situacao)}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {rotulo(c.tipo)}
                    </span>
                    {c.norma && (
                      <span className="rounded bg-marinho-50 px-2 py-0.5 text-[11px] font-medium text-marinho-700">
                        {c.norma}
                      </span>
                    )}
                    {c.gera_ordem && (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                        gera OS
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 font-medium text-slate-800">{c.nome}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.alvo_tipo}: {c.ativo_id ? (
                      <Link href={`/ativos/${c.ativo_id}`} className="text-marinho-700 hover:underline">{c.alvo}</Link>
                    ) : c.veiculo_id ? (
                      <Link href={`/frota/${c.veiculo_id}`} className="text-marinho-700 hover:underline">{c.alvo}</Link>
                    ) : c.alvo}
                    {c.predio ? ` · ${c.predio}` : ""}
                    {c.periodicidade_meses ? ` · a cada ${c.periodicidade_meses} meses` : ""}
                    {Number(c.renovacoes) > 0 ? ` · ${c.renovacoes} renovação(ões) registrada(s)` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-lg font-bold tabular-nums
                    ${dias < 0 ? "text-red-600" : dias <= 30 ? "text-amber-600" : "text-slate-700"}`}>
                    {dias < 0 ? `${num(Math.abs(dias))} d vencido` : `em ${num(dias)} d`}
                  </p>
                  <p className="text-xs text-slate-500">{data(c.proxima_data)}</p>
                  {c.custo_previsto && (
                    <p className="text-[11px] text-slate-400">previsto {brl(c.custo_previsto)}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {linhas.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-500">
            Nenhum controle com esses filtros.
          </p>
        )}
      </div>
    </div>
  );
}
