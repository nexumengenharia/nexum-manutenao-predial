import Link from "next/link";
import { notFound } from "next/navigation";
import { contexto } from "@/lib/sessao";
import * as q from "@/lib/servicos/consultas";
import { pode } from "@/lib/auth";
import { brl, num, data, dataHora, rotulo } from "@/lib/fmt";
import { Titulo, Painel, Selo, Campo, Tabela, Td } from "@/components/ui";
import MudarSituacao from "./situacao";

export const dynamic = "force-dynamic";

/* A ordem de servico era o registro mais referenciado do sistema (painel,
   carteira, listagem, ativo) e o unico sem tela propria: todos aqueles links
   caiam em 404. Esta pagina fecha o ciclo — abrir, acompanhar e concluir. */

export default async function Ordem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const ctx = await contexto();
  const o: any = await q.obterOrdem(ctx, id);
  if (!o) notFound();

  const [checklist, coment] = await Promise.all([
    q.checklistDaOrdem(ctx, id),
    q.comentarios(ctx, "ordem", id),
  ]);

  const podeMover = pode(ctx.sessao.papel, "ordem.concluir");
  const custo = o.custo_real ?? o.custo_estimado;

  return (
    <div className="space-y-5">
      <Titulo titulo={`${o.numero} · ${o.titulo}`}
        sub={`Aberta em ${dataHora(o.aberta_em)}${o.responsavel ? ` por ${o.responsavel}` : ""}`}
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/ordens" className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-white">
              Voltar à lista
            </Link>
            {podeMover && <MudarSituacao id={o.id} situacao={o.situacao} />}
          </div>
        } />

      {o.atrasada && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          <strong>Fora do prazo.</strong> O prazo era {dataHora(o.prazo_em)} e a ordem ainda não foi concluída.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Painel titulo="Identificação">
          <dl className="grid grid-cols-2 gap-3">
            <Campo rotulo="Situação"><Selo v={o.situacao} /></Campo>
            <Campo rotulo="Prioridade"><Selo v={o.prioridade} /></Campo>
            <Campo rotulo="Tipo"><Selo v={o.tipo} /></Campo>
            <Campo rotulo="Prazo">{o.prazo_em ? dataHora(o.prazo_em) : "sem prazo"}</Campo>
            <Campo rotulo="Prédio">{o.predio}</Campo>
            <Campo rotulo="Setor">{o.setor}</Campo>
            <Campo rotulo="Centro de custo">{o.centro_custo}</Campo>
            <Campo rotulo="Ativo">
              {o.ativo
                ? <Link href={`/ativos/${o.ativo_id}`} className="text-marinho-700 hover:underline">{o.ativo}</Link>
                : "—"}
            </Campo>
          </dl>
        </Painel>

        <Painel titulo="Execução">
          <dl className="grid grid-cols-2 gap-3">
            <Campo rotulo="Contratada">{o.contratada}</Campo>
            <Campo rotulo="CNPJ">{o.contratada_cnpj}</Campo>
            <Campo rotulo="Responsável">{o.responsavel}</Campo>
            <Campo rotulo="Fiscal">{o.fiscal}</Campo>
            <Campo rotulo="Iniciada em">{o.iniciada_em ? dataHora(o.iniciada_em) : "não iniciada"}</Campo>
            <Campo rotulo="Concluída em">{o.concluida_em ? dataHora(o.concluida_em) : "em aberto"}</Campo>
            <Campo rotulo="Horas trabalhadas">{o.horas_trabalhadas ? `${num(o.horas_trabalhadas, 1)} h` : "—"}</Campo>
            <Campo rotulo="Horas decorridas">
              {o.horas_decorridas ? `${num(o.horas_decorridas, 1)} h` : "—"}
            </Campo>
          </dl>
        </Painel>

        <Painel titulo="Custo e qualidade">
          <dl className="grid grid-cols-2 gap-3">
            <Campo rotulo="Custo estimado">{o.custo_estimado ? brl(o.custo_estimado) : "—"}</Campo>
            <Campo rotulo="Custo realizado">
              {o.custo_real ? brl(o.custo_real) : <span className="text-slate-400">ainda não lançado</span>}
            </Campo>
            <Campo rotulo="Nota de qualidade">
              {o.nota_qualidade ? `${num(o.nota_qualidade, 2)} / 5` : "não avaliada"}
            </Campo>
            <Campo rotulo="Dentro do prazo">
              {o.situacao === "CONCLUIDA"
                ? (o.dentro_prazo ? "sim" : "não")
                : <span className="text-slate-400">em andamento</span>}
            </Campo>
          </dl>
          {o.parecer_fiscal && (
            <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parecer do fiscal</p>
              <p className="mt-1 text-sm text-slate-700">{o.parecer_fiscal}</p>
            </div>
          )}
          {custo == null && (
            <p className="mt-3 text-xs text-slate-500">
              Sem custo lançado esta ordem não entra nos indicadores financeiros do painel.
            </p>
          )}
        </Painel>
      </div>

      {o.descricao && (
        <Painel titulo="Descrição do serviço">
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{o.descricao}</p>
        </Painel>
      )}

      <Painel titulo={`Checklist (${checklist.length} item(ns))`}>
        {checklist.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Esta ordem não nasceu de um plano com checklist, então não há itens a verificar.
          </p>
        ) : (
          <Tabela cols={["#", "Item", "Resposta", "Conforme", "Observação"]} vazio={false}>
            {(checklist as any[]).map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <Td className="tabular-nums text-xs">{i.ordem_exibicao}</Td>
                <Td>{i.descricao}</Td>
                <Td className="text-xs">{i.resposta}</Td>
                <Td>
                  {i.conforme === null || i.conforme === undefined
                    ? <span className="text-slate-400">não respondido</span>
                    : i.conforme
                      ? <span className="font-medium text-emerald-700">conforme</span>
                      : <span className="font-medium text-red-700">não conforme</span>}
                </Td>
                <Td className="text-xs">{i.observacao}</Td>
              </tr>
            ))}
          </Tabela>
        )}
      </Painel>

      <Painel titulo={`Histórico de comentários (${coment.length})`}>
        {coment.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Nenhum comentário registrado.</p>
        ) : (
          <ul className="space-y-3">
            {(coment as any[]).map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-slate-800">{c.autor_nome}</span>
                  <span className="text-[11px] text-slate-500">{dataHora(c.criado_em)}</span>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{c.texto}</p>
              </li>
            ))}
          </ul>
        )}
      </Painel>
    </div>
  );
}
