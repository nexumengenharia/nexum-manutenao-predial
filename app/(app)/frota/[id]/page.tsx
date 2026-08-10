import Link from "next/link";
import { notFound } from "next/navigation";
import { contexto } from "@/lib/sessao";
import { consultar, consultarUm } from "@/lib/db";
import { mapa } from "@/lib/mapa";
import { brl, num, data, dataHora, rotulo } from "@/lib/fmt";
import { Titulo, Painel, Selo, Campo } from "@/components/ui";
import { Serie } from "@/components/graficos";
import Mapa from "@/components/mapa";

export const dynamic = "force-dynamic";

export default async function Veiculo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await contexto();

  const v: any = await consultarUm(ctx, `
    select v.*, p.nome as predio, s.nome as setor, u.nome as condutor
      from manutencao.veiculo v
      left join manutencao.predio p on p.id = v.predio_id
      left join manutencao.setor s on s.id = v.setor_id
      left join manutencao.usuario u on u.id = v.condutor_padrao_id
     where v.id = $1 and v.excluido_em is null`, [id]);
  if (!v) notFound();

  const [abast, prev, docs, insp, multas, trajeto, ordens] = await Promise.all([
    consultar(ctx, `select * from manutencao.abastecimento
                     where veiculo_id = $1 and excluido_em is null
                     order by ocorrido_em desc limit 20`, [id]),
    consultar(ctx, `select *, (proxima_km - $2::numeric) as km_faltando
                      from manutencao.veiculo_preventiva
                     where veiculo_id = $1 and excluido_em is null and ativo
                     order by (proxima_km - $2::numeric) asc`, [id, v.hodometro]),
    consultar(ctx, `select *, (proxima_data - current_date) as dias
                      from manutencao.controle
                     where veiculo_id = $1 and excluido_em is null
                     order by proxima_data asc`, [id]),
    consultar(ctx, `select i.*, u.nome as inspetor from manutencao.veiculo_inspecao i
                     left join manutencao.usuario u on u.id = i.inspetor_id
                    where i.veiculo_id = $1 and i.excluido_em is null
                    order by i.ocorrido_em desc limit 8`, [id]),
    consultar(ctx, `select * from manutencao.multa where veiculo_id = $1 and excluido_em is null
                    order by ocorrido_em desc`, [id]),
    consultar(ctx, `select latitude, longitude, ocorrido_em, velocidade
                      from manutencao.veiculo_posicao
                     where veiculo_id = $1 and ocorrido_em >= now() - interval '6 hours'
                     order by ocorrido_em`, [id]),
    consultar(ctx, `select o.id, o.numero, o.titulo, o.tipo, o.situacao, o.custo_real, o.aberta_em
                      from manutencao.ordem o
                     where o.excluido_em is null and o.ativo_id = $1
                     order by o.aberta_em desc limit 10`, [v.ativo_id ?? id]),
  ]);

  // consumo por abastecimento (ordem cronologica para a diferenca fazer sentido)
  const cron = [...(abast as any[])].reverse();
  const consumo = cron.map((a, i) => {
    if (i === 0) return null;
    const km = Number(a.hodometro) - Number(cron[i - 1].hodometro);
    const kml = km / Number(a.litros);
    return kml > 1 && kml < 30
      ? { rotulo: data(a.ocorrido_em).slice(0, 5), valor: Number(kml.toFixed(2)) }
      : null;
  }).filter(Boolean) as { rotulo: string; valor: number }[];

  const mediaConsumo = consumo.length
    ? consumo.reduce((s, c) => s + c.valor, 0) / consumo.length : null;
  const custoKm = mediaConsumo && cron.length
    ? Number(cron[cron.length - 1]!.valor_litro) / mediaConsumo : null;

  return (
    <div className="space-y-5">
      <Titulo titulo={`${v.placa} · ${v.modelo}`}
        sub={`${v.marca} ${v.ano_fabricacao}/${v.ano_modelo} · ${v.cor} · ${rotulo(v.combustivel)}`}
        acao={<div className="flex gap-2">
          <Link href={`/frota/monitoramento?veiculo=${v.id}`}
            className="rounded-md bg-marinho-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-marinho-800">
            Ver no mapa
          </Link>
          <Link href="/frota"
            className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
            Voltar
          </Link>
        </div>} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { r: "Situação", v: rotulo(v.situacao) },
          { r: "Hodômetro", v: `${num(v.hodometro, 0)} km` },
          { r: "Consumo médio", v: mediaConsumo ? `${num(mediaConsumo, 2)} km/l` : "—" },
          { r: "Custo por km", v: custoKm ? brl(custoKm) : "—" },
          { r: "Último sinal", v: v.ultima_posicao_em ? dataHora(v.ultima_posicao_em) : "sem rastreador" },
        ].map((k) => (
          <div key={k.r} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{k.r}</p>
            <p className="mt-1 text-base font-bold tabular-nums text-marinho-900">{k.v}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Painel titulo="Identificação">
          <dl className="grid grid-cols-2 gap-3">
            <Campo rotulo="Placa"><span className="font-mono font-bold">{v.placa}</span></Campo>
            <Campo rotulo="Renavam"><span className="font-mono text-xs">{v.renavam}</span></Campo>
            <Campo rotulo="Tipo">{rotulo(v.tipo)}</Campo>
            <Campo rotulo="Tanque">{v.tanque_litros ? `${num(v.tanque_litros, 0)} L` : "—"}</Campo>
            <Campo rotulo="Base">{v.predio}</Campo>
            <Campo rotulo="Condutor padrão">{v.condutor}</Campo>
            <Campo rotulo="Aquisição">{data(v.data_aquisicao)}</Campo>
            <Campo rotulo="Valor">{brl(v.valor_aquisicao)}</Campo>
            <Campo rotulo="Rastreador">
              {v.traccar_device_id
                ? <span className="font-mono text-xs">{v.traccar_device_id}</span>
                : <span className="text-slate-400">não instalado</span>}
            </Campo>
            <Campo rotulo="Modelo do rastreador">{v.rastreador_modelo}</Campo>
          </dl>
        </Painel>

        <div className="lg:col-span-2">
          <Painel titulo="Trajeto das últimas 6 horas">
            {trajeto.length > 1 && v.ultima_latitude ? (
              <Mapa altura={280} centro={[Number(v.ultima_latitude), Number(v.ultima_longitude)]} zoom={13}
                tiles={mapa.tiles} atribuicao={mapa.atribuicao}
                trajetos={[{ pontos: (trajeto as any[]).map((p) => [Number(p.latitude), Number(p.longitude)]), cor: "#1e3a5f" }]}
                marcadores={[{
                  id: v.id, nome: v.placa, lat: Number(v.ultima_latitude), lon: Number(v.ultima_longitude),
                  cor: Number(v.ultima_velocidade) > 2 ? "#15803d" : "#64748b", tipo: "veiculo",
                  rotulo: `${num(v.ultima_velocidade, 0)} km/h`,
                }]} />
            ) : (
              <p className="py-14 text-center text-sm text-slate-500">
                Sem posições registradas nas últimas 6 horas.
              </p>
            )}
          </Painel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Trocas preventivas por uso">
          <ul className="space-y-2">
            {(prev as any[]).map((p) => {
              const falta = Number(p.km_faltando);
              const alerta = falta <= Number(p.alerta_km_antes);
              const vencido = falta < 0;
              return (
                <li key={p.id} className={`rounded-lg border p-3
                  ${vencido ? "border-red-200 bg-red-50" : alerta ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{p.item}</p>
                    <p className={`text-sm font-bold tabular-nums
                      ${vencido ? "text-red-600" : alerta ? "text-amber-600" : "text-slate-600"}`}>
                      {vencido ? `${num(Math.abs(falta), 0)} km vencido` : `faltam ${num(falta, 0)} km`}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    a cada {num(p.intervalo_km, 0)} km · última em {num(p.ultima_km, 0)} km ({data(p.ultima_data)})
                    {p.custo_previsto ? ` · previsto ${brl(p.custo_previsto)}` : ""}
                  </p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white">
                    <div className={`h-full rounded-full ${vencido ? "bg-red-500" : alerta ? "bg-amber-500" : "bg-emerald-500"}`}
                         style={{ width: `${Math.min(100, Math.max(0,
                           ((Number(v.hodometro) - Number(p.ultima_km)) / Number(p.intervalo_km)) * 100))}%` }} />
                  </div>
                </li>
              );
            })}
            {prev.length === 0 && <li className="py-6 text-center text-sm text-slate-500">
              Nenhuma preventiva cadastrada.</li>}
          </ul>
        </Painel>

        <Painel titulo="Documentação e vencimentos">
          <ul className="space-y-2">
            {(docs as any[]).map((d) => {
              const dias = Number(d.dias);
              return (
                <li key={d.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3
                  ${dias < 0 ? "border-red-200 bg-red-50" : dias <= 45 ? "border-amber-200 bg-amber-50" : "border-slate-200"}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{rotulo(d.tipo)}</p>
                    <p className="text-xs text-slate-500">
                      vence {data(d.proxima_data)}
                      {d.custo_previsto ? ` · ${brl(d.custo_previsto)}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-bold tabular-nums
                    ${dias < 0 ? "text-red-600" : dias <= 45 ? "text-amber-600" : "text-slate-600"}`}>
                    {dias < 0 ? `${num(Math.abs(dias))} d vencido` : `${num(dias)} d`}
                  </span>
                </li>
              );
            })}
            {docs.length === 0 && <li className="py-6 text-center text-sm text-slate-500">
              Nenhum documento controlado.</li>}
          </ul>
        </Painel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Consumo por abastecimento (km/l)">
          {consumo.length > 1 ? (
            <>
              <Serie dados={consumo} formato="numero" altura={140} />
              <p className="mt-2 text-[11px] text-slate-500">
                Média de {num(mediaConsumo, 2)} km/l. Queda persistente costuma anteceder
                falha mecânica — vale antecipar a revisão.
              </p>
            </>
          ) : <p className="py-10 text-center text-sm text-slate-500">Dados insuficientes.</p>}
        </Painel>

        <Painel titulo="Abastecimentos recentes">
          <div className="max-h-[280px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                  <th className="py-1.5 text-left font-semibold">Data</th>
                  <th className="py-1.5 text-right font-semibold">Hodômetro</th>
                  <th className="py-1.5 text-right font-semibold">Litros</th>
                  <th className="py-1.5 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(abast as any[]).map((a) => (
                  <tr key={a.id}>
                    <td className="py-1.5">{data(a.ocorrido_em)}</td>
                    <td className="py-1.5 text-right tabular-nums">{num(a.hodometro, 0)}</td>
                    <td className="py-1.5 text-right tabular-nums">{num(a.litros, 1)}</td>
                    <td className="py-1.5 text-right tabular-nums font-medium">{brl(a.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Inspeções">
          <ul className="space-y-1.5">
            {(insp as any[]).map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${i.conforme ? "bg-emerald-500" : "bg-amber-500"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">{rotulo(i.tipo)} · {data(i.ocorrido_em)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {i.inspetor} · {num(i.hodometro, 0)} km
                    {i.avarias ? ` · ${i.avarias}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {[["Pneus", i.pneus_ok], ["Freios", i.freios_ok], ["Luzes", i.luzes_ok],
                    ["Fluidos", i.fluidos_ok]].map(([k, ok]) => (
                    <span key={k as string} title={k as string}
                      className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
                  ))}
                </div>
              </li>
            ))}
            {insp.length === 0 && <li className="py-6 text-center text-sm text-slate-500">
              Nenhuma inspeção registrada.</li>}
          </ul>
        </Painel>

        <Painel titulo="Multas e ordens de serviço">
          {multas.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {(multas as any[]).map((m) => (
                <li key={m.id} className="rounded-lg border border-slate-100 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-slate-800">{m.descricao}</p>
                    <Selo v={m.situacao} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {data(m.ocorrido_em)} · {m.gravidade ? rotulo(m.gravidade) : ""} ·
                    {m.pontos ? ` ${m.pontos} pontos ·` : ""} {brl(m.valor)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <ul className="space-y-1.5">
            {(ordens as any[]).map((o) => (
              <li key={o.id}>
                <Link href={`/ordens/${o.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-800">{o.titulo}</p>
                    <p className="text-xs text-slate-500">{o.numero} · {data(o.aberta_em)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Selo v={o.situacao} />
                    <p className="mt-0.5 text-xs tabular-nums text-slate-600">{brl(o.custo_real)}</p>
                  </div>
                </Link>
              </li>
            ))}
            {ordens.length === 0 && multas.length === 0 && (
              <li className="py-6 text-center text-sm text-slate-500">Nenhum registro.</li>
            )}
          </ul>
        </Painel>
      </div>
    </div>
  );
}
