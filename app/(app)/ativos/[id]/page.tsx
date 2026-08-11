import Link from "next/link";
import { notFound } from "next/navigation";
import { contexto } from "@/lib/sessao";
import { consultar, consultarUm } from "@/lib/db";
import * as q from "@/lib/servicos/consultas";
import { pode } from "@/lib/auth";
import { brl, num, data, rotulo } from "@/lib/fmt";
import { Titulo, Painel, Selo, Campo, Cartao, Tabela, Td } from "@/components/ui";
import Cadastro from "@/components/cadastro";
import { camposAtivo } from "@/components/campos";

export const dynamic = "force-dynamic";

/* Ficha do equipamento. Junta num lugar so o que estava espalhado: quanto ja
   custou, se ja passou do ponto em que substituir sai mais barato que
   consertar, e o que vence. */

export default async function Ativo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const ctx = await contexto();
  const a: any = await q.obterAtivo(ctx, id);
  if (!a) notFound();

  const [hist, ind, controles, predios] = await Promise.all([
    q.historicoDoAtivo(ctx, id),
    consultarUm(ctx, `select * from manutencao.vw_indicador_ativo
       where ativo_id = $1 and tenant_id = manutencao.tenant_atual()`, [id]),
    consultar(ctx, `
      select id, nome, tipo, norma, proxima_data, situacao, custo_previsto,
             (proxima_data - current_date) as dias
        from manutencao.controle
       where ativo_id = $1 and excluido_em is null and tenant_id = manutencao.tenant_atual()
       order by proxima_data`, [id]),
    consultar(ctx, `select id, nome from manutencao.predio
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
  ]);

  const i: any = ind ?? {};
  const valor = Number(a.valor_aquisicao ?? 0);
  const gasto = Number(i.custo_total ?? 0);
  const pct = valor > 0 ? (gasto * 100) / valor : null;

  return (
    <div className="space-y-5">
      <Titulo titulo={a.nome}
        sub={`${a.codigo}${a.tombamento ? ` · tombamento ${a.tombamento}` : ""} · ${a.predio}`}
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/ativos" className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-white">
              Voltar
            </Link>
            {pode(ctx.sessao.papel, "cadastro.editar") && (
              <Cadastro entidade="ativo" titulo="Ativo" registro={a}
                        campos={camposAtivo(predios as { id: string; nome: string }[])} gatilho="Editar ficha" />
            )}
          </div>
        } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao titulo="Custo acumulado" valor={brl(gasto)}
                detalhe={`${num(i.ordens ?? 0)} ordem(ns) no histórico`} />
        <Cartao titulo="Corretivas" valor={num(i.corretivas ?? 0)}
                tom={Number(i.corretivas ?? 0) > Number(i.ordens ?? 0) / 2 ? "alerta" : "neutro"}
                detalhe="quanto maior, menos a preventiva está funcionando" />
        <Cartao titulo="Custo médio por ordem" valor={i.custo_medio ? brl(i.custo_medio) : "—"}
                detalhe="média das ordens concluídas" />
        <Cartao titulo="Consumo sobre o valor do bem"
                valor={pct !== null ? `${num(pct, 1)}%` : "—"}
                tom={pct !== null && pct >= 60 ? "critico" : pct !== null && pct >= 30 ? "alerta" : "bom"}
                detalhe={pct === null
                  ? "cadastre o valor de aquisição para calcular"
                  : pct >= 60 ? "substituir tende a sair mais barato que manter"
                  : "dentro de um patamar razoável"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Identificação">
          <dl className="grid grid-cols-2 gap-3">
            <Campo rotulo="Situação"><Selo v={a.situacao} /></Campo>
            <Campo rotulo="Criticidade"><Selo v={a.criticidade} /></Campo>
            <Campo rotulo="Categoria">{rotulo(a.categoria)}</Campo>
            <Campo rotulo="Prédio">{a.predio}</Campo>
            <Campo rotulo="Setor">{a.setor}</Campo>
            <Campo rotulo="Pavimento">{a.pavimento}</Campo>
            <Campo rotulo="Localização">{a.localizacao}</Campo>
            <Campo rotulo="Centro de custo">{a.centro_custo}</Campo>
          </dl>
        </Painel>

        <Painel titulo="Dados técnicos e patrimoniais">
          <dl className="grid grid-cols-2 gap-3">
            <Campo rotulo="Fabricante">{a.fabricante}</Campo>
            <Campo rotulo="Modelo">{a.modelo}</Campo>
            <Campo rotulo="Número de série">{a.numero_serie}</Campo>
            <Campo rotulo="Aquisição">{a.data_aquisicao ? data(a.data_aquisicao) : "—"}</Campo>
            <Campo rotulo="Valor de aquisição">{valor > 0 ? brl(valor) : "não informado"}</Campo>
            <Campo rotulo="Garantia até">
              {a.garantia_ate
                ? <span className={new Date(a.garantia_ate) < new Date() ? "text-slate-500" : "font-medium text-emerald-700"}>
                    {data(a.garantia_ate)}
                  </span>
                : "—"}
            </Campo>
            <Campo rotulo="Última manutenção">{i.ultima_manutencao ? data(i.ultima_manutencao) : "sem registro"}</Campo>
            <Campo rotulo="QR público">
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{a.codigo_publico}</code>
            </Campo>
          </dl>
          {a.observacoes && (
            <p className="mt-3 whitespace-pre-line rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {a.observacoes}
            </p>
          )}
        </Painel>
      </div>

      <Painel titulo={`Controles e vencimentos (${controles.length})`}
              acao={<Link href="/controles" className="text-xs font-medium text-marinho-700 hover:underline">Ver todos</Link>}>
        {controles.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nenhum controle vinculado. Recarga de extintor, laudo e calibração deste
            equipamento não gerarão alerta enquanto não forem cadastrados.
          </p>
        ) : (
          <Tabela cols={["Controle", "Tipo", "Norma", "Próxima data", "Prazo", "Situação", "Custo previsto"]} vazio={false}>
            {(controles as any[]).map((c) => (
              <tr key={c.id} className={c.situacao === "VENCIDO" ? "bg-red-50/60" : "hover:bg-slate-50"}>
                <Td>{c.nome}</Td>
                <Td className="text-xs">{rotulo(c.tipo)}</Td>
                <Td className="text-xs">{c.norma}</Td>
                <Td className="whitespace-nowrap text-xs">{data(c.proxima_data)}</Td>
                <Td className="whitespace-nowrap text-xs tabular-nums">
                  {Number(c.dias) < 0
                    ? <span className="font-semibold text-red-700">vencido há {Math.abs(Number(c.dias))} d</span>
                    : `faltam ${num(c.dias)} d`}
                </Td>
                <Td><Selo v={c.situacao} /></Td>
                <Td className="tabular-nums">{c.custo_previsto ? brl(c.custo_previsto) : "—"}</Td>
              </tr>
            ))}
          </Tabela>
        )}
      </Painel>

      <Painel titulo={`Histórico de manutenção (${hist.length})`}>
        <Tabela cols={["Número", "Título", "Tipo", "Situação", "Abertura", "Conclusão", "Custo"]}
                vazio={hist.length === 0}>
          {(hist as any[]).map((o) => (
            <tr key={o.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/ordens/${o.id}`} className="font-medium text-marinho-700 hover:underline">
                  {o.numero}
                </Link>
              </Td>
              <Td className="max-w-[280px] truncate">{o.titulo}</Td>
              <Td><Selo v={o.tipo} /></Td>
              <Td><Selo v={o.situacao} /></Td>
              <Td className="whitespace-nowrap text-xs">{data(o.aberta_em)}</Td>
              <Td className="whitespace-nowrap text-xs">{o.concluida_em ? data(o.concluida_em) : "—"}</Td>
              <Td className="tabular-nums">{o.custo_real ? brl(o.custo_real) : "—"}</Td>
            </tr>
          ))}
        </Tabela>
      </Painel>
    </div>
  );
}
