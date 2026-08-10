import Link from "next/link";
import { contexto } from "@/lib/sessao";
import { consultar } from "@/lib/db";
import { brl, num, data, dataHora, rotulo } from "@/lib/fmt";
import { Titulo, Painel } from "@/components/ui";
import { IconeCategoria } from "@/components/icones";
import { BarrasNav } from "@/components/graficos";

export const dynamic = "force-dynamic";

const COR_SIT: Record<string, string> = {
  DISPONIVEL: "bg-emerald-500", EM_USO: "bg-sky-500",
  EM_MANUTENCAO: "bg-amber-500", PARADO: "bg-red-500", BAIXADO: "bg-slate-400",
};

export default async function Frota() {
  const ctx = await contexto();
  const [veiculos, resumo] = await Promise.all([
    consultar(ctx, `
      select v.*, p.nome as predio, u.nome as condutor,
        (select round(avg(sub.km_por_litro)::numeric, 2) from (
           select (a.hodometro - lag(a.hodometro) over (order by a.ocorrido_em)) / nullif(a.litros,0) as km_por_litro
             from manutencao.abastecimento a
            where a.veiculo_id = v.id and a.excluido_em is null
            order by a.ocorrido_em desc limit 8) sub
         where sub.km_por_litro between 1 and 30)                                as consumo_medio,
        (select coalesce(sum(a.valor_total),0) from manutencao.abastecimento a
          where a.veiculo_id = v.id and a.excluido_em is null
            and a.ocorrido_em >= date_trunc('year', now()))                      as combustivel_ano,
        (select count(*) from manutencao.veiculo_preventiva pv
          where pv.veiculo_id = v.id and pv.excluido_em is null and pv.ativo
            and (pv.proxima_km - v.hodometro) <= pv.alerta_km_antes)             as preventivas_alerta,
        (select count(*) from manutencao.controle c
          where c.veiculo_id = v.id and c.excluido_em is null
            and c.situacao in ('VENCIDO','A_VENCER'))                            as docs_alerta,
        (select count(*) from manutencao.multa m
          where m.veiculo_id = v.id and m.excluido_em is null and m.situacao = 'ABERTA') as multas_abertas,
        (select count(*) from manutencao.veiculo_evento e
          where e.veiculo_id = v.id and e.excluido_em is null and e.tratado = false
            and e.ocorrido_em >= now() - interval '7 days')                      as eventos
       from manutencao.veiculo v
       left join manutencao.predio p on p.id = v.predio_id
       left join manutencao.usuario u on u.id = v.condutor_padrao_id
      where v.excluido_em is null
      order by v.placa`),
    consultar(ctx, `
      select
        (select count(*) from manutencao.veiculo where excluido_em is null)                as total,
        (select count(*) from manutencao.veiculo where excluido_em is null
          and situacao = 'EM_MANUTENCAO')                                                  as manutencao,
        (select coalesce(sum(valor_total),0) from manutencao.abastecimento
          where excluido_em is null and ocorrido_em >= date_trunc('year', now()))          as combustivel_ano,
        (select coalesce(sum(litros),0) from manutencao.abastecimento
          where excluido_em is null and ocorrido_em >= date_trunc('year', now()))          as litros_ano,
        (select count(*) from manutencao.multa where excluido_em is null and situacao='ABERTA') as multas,
        (select coalesce(sum(valor),0) from manutencao.multa
          where excluido_em is null and situacao='ABERTA')                                 as valor_multas`),
  ]);

  const r: any = resumo[0] ?? {};
  const gastoPorVeiculo = (veiculos as any[])
    .map((v) => ({ rotulo: `${v.placa} · ${v.modelo}`, valor: Number(v.combustivel_ano),
                   href: `/frota/${v.id}`,
                   detalhe: `${num(v.hodometro)} km${v.consumo_medio ? ` · ${num(v.consumo_medio, 2)} km/l` : ""}` }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <div className="space-y-5">
      <Titulo titulo="Frota"
        sub="Manutenção, abastecimento, documentação e monitoramento dos veículos institucionais."
        acao={<Link href="/frota/monitoramento"
          className="rounded-md bg-marinho-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-marinho-800">
          Monitoramento em tempo real
        </Link>} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { r: "Veículos", v: num(r.total), t: "neutro" },
          { r: "Em manutenção", v: num(r.manutencao), t: Number(r.manutencao) ? "alerta" : "bom" },
          { r: "Combustível no ano", v: brl(r.combustivel_ano), t: "neutro" },
          { r: "Litros no ano", v: `${num(r.litros_ano, 0)} L`, t: "neutro" },
          { r: "Multas em aberto", v: `${num(r.multas)} · ${brl(r.valor_multas)}`,
            t: Number(r.multas) ? "critico" : "bom" },
        ].map((k) => (
          <div key={k.r} className={`rounded-xl border-l-4 bg-white p-4 shadow-sm
            ${k.t === "critico" ? "border-red-400" : k.t === "alerta" ? "border-amber-400"
              : k.t === "bom" ? "border-emerald-400" : "border-slate-200"}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{k.r}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-marinho-900">{k.v}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {(veiculos as any[]).map((v) => {
              const alertas = Number(v.preventivas_alerta) + Number(v.docs_alerta)
                            + Number(v.multas_abertas) + Number(v.eventos);
              return (
                <Link key={v.id} href={`/frota/${v.id}`}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm
                             transition hover:-translate-y-1 hover:border-marinho-300 hover:shadow-lg">
                  <div className="flex items-start gap-3 p-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-emerald-50 p-2.5
                                     transition group-hover:scale-110">
                      <IconeCategoria categoria="VEICULO" className="block h-full w-full" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-sm font-bold tracking-wider text-marinho-900">{v.placa}</p>
                        <span aria-hidden title={rotulo(v.situacao)}
                              className={`h-2.5 w-2.5 rounded-full ${COR_SIT[v.situacao] ?? "bg-slate-300"}`} />
                      </div>
                      <p className="truncate text-sm text-slate-700">{v.modelo}</p>
                      <p className="truncate text-xs text-slate-500">
                        {v.ano_fabricacao}/{v.ano_modelo} · {v.cor} · {rotulo(v.combustivel)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
                    <div className="px-2 py-2 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Hodômetro</p>
                      <p className="text-sm font-bold tabular-nums text-slate-700">{num(v.hodometro, 0)}</p>
                    </div>
                    <div className="px-2 py-2 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Consumo</p>
                      <p className="text-sm font-bold tabular-nums text-slate-700">
                        {v.consumo_medio ? `${num(v.consumo_medio, 1)}` : "—"}
                        <span className="text-[9px] font-normal text-slate-400"> km/l</span>
                      </p>
                    </div>
                    <div className="px-2 py-2 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Combustível</p>
                      <p className="text-sm font-bold tabular-nums text-slate-700">
                        {Number(v.combustivel_ano) >= 1000
                          ? `${num(Number(v.combustivel_ano) / 1000, 1)}k` : num(v.combustivel_ano, 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${v.ultima_posicao_em
                        ? (Number(v.ultima_velocidade) > 2 ? "animate-pulse bg-emerald-500" : "bg-slate-400")
                        : "bg-slate-300"}`} />
                      {v.ultima_posicao_em
                        ? (Number(v.ultima_velocidade) > 2
                            ? `em movimento · ${num(v.ultima_velocidade, 0)} km/h`
                            : `parado · ${dataHora(v.ultima_posicao_em)}`)
                        : "sem rastreador"}
                    </span>
                    {alertas > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        {alertas} alerta(s)
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <Painel titulo="Gasto de combustível no ano">
          <BarrasNav formato="moeda" dados={gastoPorVeiculo} />
          <p className="mt-3 rounded bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
            Consumo calculado pela diferença de hodômetro entre abastecimentos completos.
            Queda súbita de km/l costuma indicar problema mecânico antes de qualquer sintoma aparente.
          </p>
        </Painel>
      </div>
    </div>
  );
}
