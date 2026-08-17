import Link from "next/link";
import { contexto } from "@/lib/sessao";
import { consultar } from "@/lib/db";
import { brl, data, dataHora, rotulo } from "@/lib/fmt";
import { Titulo, Selo, Tabela, Td, Cartao } from "@/components/ui";
import FiltroColuna from "@/components/filtro-coluna";

export const dynamic = "force-dynamic";

/* Renomeado no menu para "Execucao de servicos". A URL continua /solicitacoes
   por compatibilidade; a fonte de dados foi trocada: agora sao ORDENS ativas
   (nao mais os pedidos brutos). O gestor/fiscal e as equipes internas veem
   tudo; a filtragem por contratada logada ainda depende de vincular usuario
   a contratada (ver relatorio de auditoria). */

const SITUACOES = ["ABERTA", "EM_EXECUCAO", "AGUARDANDO_PECA"];
const EXECUCAO = ["INTERNA_MANUTENCAO", "INTERNA_ZELADORIA", "EXTERNA"];
const PRIORIDADES = ["URGENTE", "ALTA", "MEDIA", "BAIXA"];

const COR_EXEC: Record<string, string> = {
  INTERNA_MANUTENCAO: "bg-marinho-100 text-marinho-800 ring-marinho-500/20",
  INTERNA_ZELADORIA: "bg-cyan-100 text-cyan-900 ring-cyan-600/20",
  EXTERNA: "bg-amber-100 text-amber-900 ring-amber-600/20",
};
const ROT_EXEC: Record<string, string> = {
  INTERNA_MANUTENCAO: "Interna · Manutenção",
  INTERNA_ZELADORIA: "Interna · Zeladoria",
  EXTERNA: "Externa",
};

const op = (vs: string[], mapa?: Record<string, string>) =>
  vs.map((v) => ({ v, t: (mapa && mapa[v]) || rotulo(v) }));

export default async function Execucao({ searchParams }: { searchParams: Promise<any> }) {
  const sp = await searchParams;
  const ctx = await contexto();

  const situacao = SITUACOES.includes(sp.situacao) ? sp.situacao : undefined;
  const execucao = EXECUCAO.includes(sp.execucao) ? sp.execucao : undefined;
  const prioridade = PRIORIDADES.includes(sp.prioridade) ? sp.prioridade : undefined;
  const contratada = typeof sp.contratada === "string" && /^[0-9a-f-]{36}$/i.test(sp.contratada) ? sp.contratada : undefined;

  const [lista, contratadas] = await Promise.all([
    consultar(ctx, `
      select o.id, o.numero, o.titulo, o.situacao, o.prioridade, o.tipo, o.execucao,
             o.aberta_em, o.prazo_em, o.custo_estimado,
             p.nome as predio, s.nome as setor, a.nome as ativo,
             c.razao_social as contratada, c.id as contratada_id,
             u.nome as responsavel,
             (o.prazo_em is not null and o.prazo_em < now() and o.situacao not in ('CONCLUIDA','CANCELADA')) as atrasada
        from manutencao.ordem o
        join manutencao.predio p on p.id = o.predio_id
        left join manutencao.setor s on s.id = o.setor_id
        left join manutencao.ativo a on a.id = o.ativo_id
        left join manutencao.contratada c on c.id = o.contratada_id
        left join manutencao.usuario u on u.id = o.responsavel_id
       where o.excluido_em is null and o.tenant_id = manutencao.tenant_atual()
         and o.situacao in ('ABERTA','EM_EXECUCAO','AGUARDANDO_PECA')
         and ($1::text is null or o.situacao = $1)
         and ($2::text is null or o.execucao = $2)
         and ($3::text is null or o.prioridade = $3)
         and ($4::uuid is null or o.contratada_id = $4::uuid)
       order by (o.prazo_em < now()) desc,
                array_position(array['URGENTE','ALTA','MEDIA','BAIXA'], o.prioridade),
                o.aberta_em asc`,
      [situacao ?? null, execucao ?? null, prioridade ?? null, contratada ?? null]),
    consultar(ctx, `select id, razao_social from manutencao.contratada
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by razao_social`),
  ]);

  const conta = (s: string) => lista.filter((x: any) => x.situacao === s).length;
  const contaExec = (e: string) => lista.filter((x: any) => x.execucao === e).length;
  const atrasadas = lista.filter((x: any) => x.atrasada).length;
  const custoComp = lista.reduce((s: number, x: any) => s + Number(x.custo_estimado ?? 0), 0);

  const filtros = [
    situacao && `situação: ${rotulo(situacao)}`,
    execucao && `execução: ${ROT_EXEC[execucao]}`,
    prioridade && `prioridade: ${rotulo(prioridade)}`,
    contratada && `contratada`,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <Titulo titulo="Execução de serviços"
        sub={`${lista.length} OS ativa(s)${filtros.length ? ` · ${filtros.join(" · ")}` : ""} — ${ctx.sessao.tribunal}`}
        acao={filtros.length ? (
          <Link href="/solicitacoes" className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-white">
            Limpar filtros
          </Link>
        ) : undefined} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao titulo="Abertas" valor={conta("ABERTA")} detalhe="ainda sem começar" />
        <Cartao titulo="Em execução" valor={conta("EM_EXECUCAO")} detalhe="equipe atuando" />
        <Cartao titulo="Aguardando peça" valor={conta("AGUARDANDO_PECA")}
                tom={conta("AGUARDANDO_PECA") > 0 ? "alerta" : "neutro"} detalhe="material a caminho" />
        <Cartao titulo="Fora do prazo" valor={atrasadas}
                tom={atrasadas > 0 ? "critico" : "bom"} detalhe={brl(custoComp) + " comprometido"} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/solicitacoes"
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${!execucao ? "bg-marinho-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
          Todas ({lista.length})
        </Link>
        {EXECUCAO.map((e) => (
          <Link key={e} href={`/solicitacoes?execucao=${e}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${
              execucao === e ? "bg-marinho-700 text-white ring-marinho-700" : COR_EXEC[e]}`}>
            {ROT_EXEC[e]} ({contaExec(e)})
          </Link>
        ))}
      </div>

      <Tabela cols={[
                "Número", "Título",
                <FiltroColuna key="situacao" campo="situacao" rotulo="Situação" opcoes={op(SITUACOES)} />,
                <FiltroColuna key="prioridade" campo="prioridade" rotulo="Prioridade" opcoes={op(PRIORIDADES)} />,
                <FiltroColuna key="execucao" campo="execucao" rotulo="Execução" opcoes={op(EXECUCAO, ROT_EXEC)} />,
                "Prédio", "Ativo",
                <FiltroColuna key="contratada" campo="contratada" rotulo="Contratada"
                  opcoes={(contratadas as any[]).map((c) => ({ v: c.id, t: c.razao_social }))} />,
                "Prazo",
              ]}
              vazio={lista.length === 0}>
        {(lista as any[]).map((o) => (
          <tr key={o.id} className={o.atrasada ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50"}>
            <Td className="font-mono text-xs">
              <Link href={`/ordens/${o.id}`} className="font-medium text-marinho-700 hover:underline">{o.numero}</Link>
            </Td>
            <Td className="max-w-[260px] truncate">
              <Link href={`/ordens/${o.id}`} className="hover:underline">{o.titulo}</Link>
            </Td>
            <Td><Selo v={o.situacao} /></Td>
            <Td><Selo v={o.prioridade} /></Td>
            <Td>
              {o.execucao ? (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${COR_EXEC[o.execucao]}`}>
                  {ROT_EXEC[o.execucao]}
                </span>
              ) : <span className="text-slate-400">—</span>}
            </Td>
            <Td>
              <span className="block max-w-[180px] truncate">{o.predio}</span>
              <span className="block max-w-[180px] truncate text-xs text-slate-500">{o.setor}</span>
            </Td>
            <Td className="max-w-[160px] truncate text-xs">{o.ativo}</Td>
            <Td className="max-w-[160px] truncate text-xs">{o.contratada}</Td>
            <Td className="whitespace-nowrap tabular-nums text-xs">
              {o.prazo_em ? data(o.prazo_em) : "—"}
              <span className={`ml-1 block text-[10px] ${o.atrasada ? "font-bold text-red-700" : "text-slate-400"}`}>
                aberta em {dataHora(o.aberta_em)}
              </span>
            </Td>
          </tr>
        ))}
      </Tabela>
    </div>
  );
}
