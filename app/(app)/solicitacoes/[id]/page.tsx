import Link from "next/link";
import { notFound } from "next/navigation";
import { contexto } from "@/lib/sessao";
import { consultar, consultarUm } from "@/lib/db";
import { pode } from "@/lib/auth";
import { num, data, dataHora, rotulo } from "@/lib/fmt";
import { Titulo, Painel, Selo, Campo } from "@/components/ui";
import Triagem from "./triagem";
import Converter from "./converter";

export const dynamic = "force-dynamic";

/* Ficha da solicitacao: onde o triador ve o relato completo, define a
   prioridade e converte em Ordem de Servico formal. Sem esta pagina o card
   do Quadro nao tinha para onde ir — a triagem descrita no manual nao
   existia na pratica. */

export default async function Solicitacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const ctx = await contexto();
  const s: any = await consultarUm(ctx, `
    select s.*, p.nome as predio, st.nome as setor, a.nome as ativo, pt.nome as ponto, pt.tipo as ponto_tipo,
           o.numero as ordem_numero
      from manutencao.solicitacao s
      left join manutencao.predio p on p.id = s.predio_id
      left join manutencao.setor st on st.id = s.setor_id
      left join manutencao.ativo a on a.id = s.ativo_id
      left join manutencao.ponto pt on pt.id = s.ponto_id
      left join manutencao.ordem o on o.id = s.ordem_id
     where s.id = $1 and s.tenant_id = manutencao.tenant_atual() and s.excluido_em is null`, [id]);
  if (!s) notFound();

  const [contratadas, ativos] = await Promise.all([
    consultar(ctx, `select id, razao_social as nome from manutencao.contratada
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by razao_social`),
    consultar(ctx, `select id, nome from manutencao.ativo
                      where excluido_em is null and tenant_id = manutencao.tenant_atual() order by nome`),
  ]);

  const podeTriar = pode(ctx.sessao.papel, "solicitacao.triar");
  const jaConvertida = Boolean(s.ordem_id);

  return (
    <div className="space-y-5">
      <Titulo titulo={`${s.numero} · ${s.titulo}`}
        sub={`Aberta em ${dataHora(s.criado_em)} por ${s.solicitante_nome}${s.origem === "QRCODE" ? " · via QR Code" : ""}`}
        acao={
          <Link href="/quadro" className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-white">
            Voltar ao quadro
          </Link>
        } />

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Relato">
          <dl className="grid grid-cols-2 gap-3">
            <Campo rotulo="Situação"><Selo v={s.situacao} /></Campo>
            <Campo rotulo="Prioridade"><Selo v={s.prioridade} /></Campo>
            <Campo rotulo="Natureza">{rotulo(s.natureza)}</Campo>
            <Campo rotulo="Prazo">{s.prazo_em ? dataHora(s.prazo_em) : "—"}</Campo>
            <Campo rotulo="Prédio">{s.predio}</Campo>
            <Campo rotulo="Setor">{s.setor}</Campo>
            <Campo rotulo="Ponto">{s.ponto}</Campo>
            <Campo rotulo="Ativo">
              {s.ativo_id
                ? <Link href={`/ativos/${s.ativo_id}`} className="text-marinho-700 hover:underline">{s.ativo}</Link>
                : "—"}
            </Campo>
            <Campo rotulo="Solicitante">{s.solicitante_nome}</Campo>
            <Campo rotulo="Contato">{s.solicitante_contato}</Campo>
          </dl>
          {s.descricao && (
            <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição do relato</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{s.descricao}</p>
            </div>
          )}
        </Painel>

        <div className="space-y-4">
          <Painel titulo="Triagem">
            {jaConvertida ? (
              <p className="text-sm text-slate-600">
                Esta solicitação já foi triada e convertida em{" "}
                <Link href={`/ordens/${s.ordem_id}`} className="font-medium text-marinho-700 hover:underline">
                  {s.ordem_numero}
                </Link>.
              </p>
            ) : podeTriar ? (
              <Triagem id={s.id} prioridadeAtual={s.prioridade} />
            ) : (
              <p className="text-sm text-slate-500">Seu perfil não tem permissão para triar chamados.</p>
            )}
          </Painel>

          {!jaConvertida && podeTriar && (
            <Painel titulo="Converter em Ordem de Serviço">
              <p className="mb-3 text-xs text-slate-500">
                Cria a OS formal vinculada a esta solicitação, com número próprio, descrição técnica e prazo.
                A solicitação sai do quadro assim que a OS é criada.
              </p>
              <Converter id={s.id} tituloSugerido={s.titulo} descricaoSugerida={s.descricao}
                         prioridadeSugerida={s.prioridade} contratadas={contratadas as any}
                         ativos={ativos as any} ativoSugerido={s.ativo_id} />
            </Painel>
          )}
        </div>
      </div>
    </div>
  );
}
