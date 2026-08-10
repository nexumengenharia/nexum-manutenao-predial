import Link from "next/link";
import { contexto } from "@/lib/sessao";
import { consultar } from "@/lib/db";
import { mapa } from "@/lib/mapa";
import { brl, num, rotulo } from "@/lib/fmt";
import { Titulo, Painel } from "@/components/ui";
import { IconePredio, CORES_PREDIO } from "@/components/icones";
import Mapa from "@/components/mapa";
import Cadastro from "@/components/cadastro";
import { CAMPOS_PREDIO } from "@/components/campos";
import { pode } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Predios() {
  const ctx = await contexto();
  const podeEditar = pode(ctx.sessao.papel, "cadastro.editar");
  const [predios, veiculos] = await Promise.all([
    consultar(ctx, `
      select v.*, p.endereco, p.cidade, p.uf, p.area_m2, p.pavimentos,
             (select count(*) from manutencao.setor s
               where s.predio_id = v.predio_id and s.excluido_em is null)      as setores,
             (select count(*) from manutencao.ponto pt
               where pt.predio_id = v.predio_id and pt.excluido_em is null)    as pontos,
             (select count(*) from manutencao.solicitacao so
               where so.predio_id = v.predio_id and so.excluido_em is null
                 and so.situacao in ('ABERTA','TRIAGEM','EM_EXECUCAO'))        as chamados
        from manutencao.vw_indicador_predio v
        join manutencao.predio p on p.id = v.predio_id
       order by v.custo_total desc`),
    consultar(ctx, `
      select id, placa, modelo, situacao, ultima_latitude, ultima_longitude,
             ultima_velocidade, ultima_posicao_em
        from manutencao.veiculo
       where excluido_em is null and ultima_latitude is not null`),
  ]);

  const marcadores = [
    ...predios.filter((p: any) => p.latitude).map((p: any) => ({
      id: p.predio_id, nome: p.predio, lat: Number(p.latitude), lon: Number(p.longitude),
      cor: CORES_PREDIO[p.predio_tipo] ?? "#1e3a5f", tipo: "predio" as const,
      rotulo: `${rotulo(p.predio_tipo)} · ${num(p.ativos)} ativos`,
      detalhe: `<b>${num(p.em_aberto)}</b> ordens abertas${Number(p.atrasadas) > 0
        ? ` · <span style="color:#dc2626"><b>${num(p.atrasadas)}</b> atrasadas</span>` : ""}
        <br/>Custo acumulado: <b>${brl(p.custo_total)}</b>`,
      href: `/ordens?predio=${p.predio_id}`,
    })),
    ...veiculos.map((v: any) => ({
      id: v.id, nome: v.placa, lat: Number(v.ultima_latitude), lon: Number(v.ultima_longitude),
      cor: v.situacao === "EM_MANUTENCAO" ? "#d97706" : Number(v.ultima_velocidade) > 2 ? "#15803d" : "#64748b",
      tipo: "veiculo" as const,
      rotulo: `${v.modelo} · ${rotulo(v.situacao)}`,
      detalhe: `Velocidade: <b>${num(v.ultima_velocidade, 0)} km/h</b>`,
      href: `/frota/${v.id}`,
    })),
  ];

  const totalCusto = predios.reduce((s: number, p: any) => s + Number(p.custo_total), 0);

  return (
    <div className="space-y-5">
      <Titulo titulo="Prédios e setores"
        sub={`${predios.length} imóvel(is) sob responsabilidade de manutenção${veiculos.length ? ` e ${veiculos.length} veículo(s) monitorado(s)` : ""}.`}
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/frota/monitoramento"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white">
              Monitoramento da frota
            </Link>
            {podeEditar && (
              <Cadastro entidade="predio" titulo="Prédio" campos={CAMPOS_PREDIO} />
            )}
          </div>
        } />

      <Painel titulo="Mapa das unidades"
        acao={<span className="text-[11px] text-slate-500">Clique no marcador para ver o resumo</span>}>
        <Mapa marcadores={marcadores} centro={mapa.centroPadrao} zoom={mapa.zoomPadrao}
              tiles={mapa.tiles} atribuicao={mapa.atribuicao} altura={440} />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
          {Object.entries(CORES_PREDIO).slice(0, 5).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded" style={{ background: c }} />
              {rotulo(k)}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Veículo em movimento
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-slate-500" /> Veículo parado
          </span>
        </div>
      </Painel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {predios.map((p: any) => {
          const cor = CORES_PREDIO[p.predio_tipo] ?? "#1e3a5f";
          const pctCusto = totalCusto ? (Number(p.custo_total) / totalCusto) * 100 : 0;
          return (
            <article key={p.predio_id}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm
                         transition hover:-translate-y-1 hover:shadow-lg">
              <div className="relative h-24 overflow-hidden"
                   style={{ background: `linear-gradient(135deg, ${cor} 0%, ${cor}cc 100%)` }}>
                <div className="absolute -right-3 -top-3 h-28 w-28 opacity-15 transition group-hover:scale-110">
                  <IconePredio tipo={p.predio_tipo} className="block h-full w-full [&_svg]:stroke-white" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                    {rotulo(p.predio_tipo)}
                  </p>
                  <h2 className="text-base font-semibold leading-tight text-white">{p.predio}</h2>
                </div>
                {Number(p.atrasadas) > 0 && (
                  <span className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {num(p.atrasadas)} atrasadas
                  </span>
                )}
              </div>

              <div className="p-4">
                <p className="truncate text-xs text-slate-500">
                  {p.endereco}{p.cidade ? ` · ${p.cidade}/${p.uf ?? ""}` : ""}
                </p>

                <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {[
                    ["Ativos", num(p.ativos)],
                    ["Setores", num(p.setores)],
                    ["Pontos QR", num(p.pontos)],
                    ["OS abertas", num(p.em_aberto)],
                  ].map(([k, v]) => (
                    <div key={k as string} className="rounded-lg bg-slate-50 py-1.5">
                      <dt className="text-[9px] uppercase tracking-wide text-slate-400">{k}</dt>
                      <dd className="text-sm font-bold tabular-nums text-slate-700">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Custo acumulado</span>
                    <strong className="tabular-nums text-marinho-900">{brl(p.custo_total)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Custo médio por OS</span>
                    <strong className="tabular-nums text-slate-700">{brl(p.custo_medio)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tempo médio de conclusão</span>
                    <strong className="tabular-nums text-slate-700">
                      {p.horas_medias ? `${num(p.horas_medias, 1)} h` : "—"}
                    </strong>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full transition-all duration-700"
                         style={{ width: `${Math.max(pctCusto, 2)}%`, background: cor }} />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {num(pctCusto, 1)}% do custo total da instituição
                  </p>
                </div>

                <div className="mt-3 flex gap-1.5">
                  <Link href={`/ordens?predio=${p.predio_id}`}
                    className="flex-1 rounded-md bg-marinho-700 px-2 py-1.5 text-center text-xs font-medium text-white hover:bg-marinho-800">
                    Ver serviços
                  </Link>
                  <Link href={`/ativos?predio=${p.predio_id}`}
                    className="flex-1 rounded-md bg-slate-100 px-2 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-slate-200">
                    Ver ativos
                  </Link>
                  {Number(p.chamados) > 0 && (
                    <Link href="/quadro"
                      className="rounded-md bg-amber-100 px-2 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200">
                      {num(p.chamados)}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
