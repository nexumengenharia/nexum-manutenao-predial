import Link from "next/link";
import { contexto } from "@/lib/sessao";
import { consultar } from "@/lib/db";
import { mapa } from "@/lib/mapa";
import { num, dataHora, rotulo } from "@/lib/fmt";
import { Titulo, Painel, Selo, Cartao, Tabela, Td } from "@/components/ui";
import Mapa from "@/components/mapa";

export const dynamic = "force-dynamic";

/* Esta rota era referenciada pelo menu e pelo alerta de frota do painel, mas
   nao existia como pagina: caia no segmento dinamico /frota/[id], que tentava
   ler "monitoramento" como UUID e derrubava a requisicao com erro 500.
   Como segmento estatico, agora tem precedencia sobre o dinamico. */

const COR_SIT: Record<string, string> = {
  DISPONIVEL: "#059669", EM_USO: "#2563eb", EM_MANUTENCAO: "#d97706",
  PARADO: "#dc2626", BAIXADO: "#64748b",
};

export default async function Monitoramento({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams;
  const ctx = await contexto();
  const foco = typeof sp.veiculo === "string" && /^[0-9a-f-]{36}$/i.test(sp.veiculo) ? sp.veiculo : null;

  const [veiculos, eventos] = await Promise.all([
    consultar(ctx, `
      select v.id, v.placa, v.marca, v.modelo, v.tipo, v.situacao, v.hodometro,
             v.ultima_latitude, v.ultima_longitude, v.ultima_velocidade,
             v.ultimo_ignicao, v.ultima_posicao_em, v.traccar_device_id,
             p.nome as predio, u.nome as condutor,
             round(extract(epoch from (now() - v.ultima_posicao_em))/60.0) as min_sem_sinal
        from manutencao.veiculo v
        left join manutencao.predio p on p.id = v.predio_id
        left join manutencao.usuario u on u.id = v.condutor_padrao_id
       where v.excluido_em is null and v.tenant_id = manutencao.tenant_atual()
       order by v.placa`),
    consultar(ctx, `
      select e.id, e.veiculo_id, e.tipo, e.ocorrido_em, e.valor, e.descricao, e.tratado,
             e.latitude, e.longitude, v.placa
        from manutencao.veiculo_evento e
        join manutencao.veiculo v on v.id = e.veiculo_id
       where e.excluido_em is null and e.tenant_id = manutencao.tenant_atual()
         and e.ocorrido_em >= now() - interval '30 days'
         and ($1::uuid is null or e.veiculo_id = $1::uuid)
       order by e.tratado asc, e.ocorrido_em desc
       limit 200`, [foco]),
  ]);

  const lista = veiculos as any[];
  const evs = eventos as any[];

  const comSinal = lista.filter((v) => v.ultima_latitude !== null);
  const semTratativa = evs.filter((e) => !e.tratado);
  const rastreados = lista.filter((v) => v.traccar_device_id).length;
  const emUso = lista.filter((v) => v.situacao === "EM_USO").length;

  const marcadores = comSinal
    .filter((v) => !foco || v.id === foco)
    .map((v) => ({
      id: v.id,
      nome: v.placa,
      lat: Number(v.ultima_latitude),
      lon: Number(v.ultima_longitude),
      cor: COR_SIT[v.situacao] ?? "#64748b",
      tipo: "veiculo" as const,
      rotulo: `${v.marca ?? ""} ${v.modelo ?? ""}`.trim() || rotulo(v.tipo),
      detalhe: `${rotulo(v.situacao)}${v.ultima_velocidade != null ? ` · ${num(v.ultima_velocidade)} km/h` : ""}`
        + (v.ultima_posicao_em ? `<br>sinal de ${dataHora(v.ultima_posicao_em)}` : ""),
    }));

  return (
    <div className="space-y-5">
      <Titulo titulo="Monitoramento da frota"
        sub={`${comSinal.length} de ${lista.length} veículo(s) com posição conhecida${foco ? " — filtrado por veículo" : ""}.`}
        acao={
          <div className="flex flex-wrap items-center gap-2">
            {foco && (
              <Link href="/frota/monitoramento"
                className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-white">
                Ver toda a frota
              </Link>
            )}
            <Link href="/frota"
              className="rounded-md bg-marinho-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-marinho-800">
              Lista de veículos
            </Link>
          </div>
        } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao titulo="Eventos sem tratativa" valor={num(semTratativa.length)}
                tom={semTratativa.length > 0 ? "critico" : "bom"}
                detalhe={semTratativa.length > 0 ? "excesso de velocidade, cerca, ignição" : "nada pendente"} />
        <Cartao titulo="Em uso agora" valor={num(emUso)} detalhe={`de ${lista.length} veículos`} />
        <Cartao titulo="Com rastreador" valor={num(rastreados)}
                tom={rastreados === 0 ? "alerta" : "neutro"}
                detalhe={rastreados === 0 ? "nenhum device Traccar vinculado" : "vinculados ao Traccar"} />
        <Cartao titulo="Sem sinal recente" valor={num(comSinal.filter((v) => Number(v.min_sem_sinal ?? 0) > 60).length)}
                tom="alerta" detalhe="última posição há mais de 1 h" />
      </div>

      <Painel titulo="Posição atual"
        acao={<span className="text-[11px] text-slate-500">A cor do marcador indica a situação do veículo</span>}>
        {marcadores.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Nenhum veículo com posição registrada. As coordenadas chegam pela integração
            de telemetria; sem device vinculado o mapa fica vazio.
          </p>
        ) : (
          <Mapa marcadores={marcadores} centro={mapa.centroPadrao} zoom={foco ? 14 : mapa.zoomPadrao}
                tiles={mapa.tiles} atribuicao={mapa.atribuicao} altura={420} />
        )}
      </Painel>

      <Painel titulo={`Eventos dos últimos 30 dias (${evs.length})`}>
        <Tabela cols={["Veículo", "Evento", "Quando", "Valor", "Descrição", "Tratativa"]}
                vazio={evs.length === 0}>
          {evs.map((e) => (
            <tr key={e.id} className={!e.tratado ? "bg-amber-50/60" : "hover:bg-slate-50"}>
              <Td>
                <Link href={`/frota/${e.veiculo_id}`} className="font-medium text-marinho-700 hover:underline">
                  {e.placa}
                </Link>
              </Td>
              <Td><Selo v={e.tipo} /></Td>
              <Td className="whitespace-nowrap text-xs">{dataHora(e.ocorrido_em)}</Td>
              <Td className="tabular-nums text-xs">{e.valor != null ? num(e.valor, 1) : "—"}</Td>
              <Td className="max-w-[280px] truncate text-xs">{e.descricao}</Td>
              <Td>
                {e.tratado
                  ? <span className="text-xs text-emerald-700">tratado</span>
                  : <span className="text-xs font-semibold text-amber-700">pendente</span>}
              </Td>
            </tr>
          ))}
        </Tabela>
      </Painel>

      <Painel titulo="Situação por veículo">
        <Tabela cols={["Placa", "Veículo", "Situação", "Condutor", "Lotação", "Hodômetro", "Último sinal"]}
                vazio={lista.length === 0}>
          {lista.map((v) => (
            <tr key={v.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/frota/${v.id}`} className="font-medium text-marinho-700 hover:underline">
                  {v.placa}
                </Link>
              </Td>
              <Td className="text-xs">{`${v.marca ?? ""} ${v.modelo ?? ""}`.trim() || rotulo(v.tipo)}</Td>
              <Td><Selo v={v.situacao} /></Td>
              <Td className="max-w-[160px] truncate text-xs">{v.condutor}</Td>
              <Td className="max-w-[160px] truncate text-xs">{v.predio}</Td>
              <Td className="tabular-nums text-xs">{num(v.hodometro)} km</Td>
              <Td className="whitespace-nowrap text-xs">
                {v.ultima_posicao_em
                  ? <>
                      {dataHora(v.ultima_posicao_em)}
                      {Number(v.min_sem_sinal ?? 0) > 60 && (
                        <span className="block text-[11px] font-medium text-amber-700">
                          há {num(Number(v.min_sem_sinal) / 60, 1)} h sem sinal
                        </span>
                      )}
                    </>
                  : <span className="text-slate-400">sem telemetria</span>}
              </Td>
            </tr>
          ))}
        </Tabela>
      </Painel>
    </div>
  );
}
