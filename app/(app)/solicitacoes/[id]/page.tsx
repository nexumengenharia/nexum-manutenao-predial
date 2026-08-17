import Link from "next/link";
import { notFound } from "next/navigation";
import { contexto } from "@/lib/sessao";
import { consultarUm } from "@/lib/db";
import { pode } from "@/lib/auth";
import { dataHora, rotulo } from "@/lib/fmt";
import { Titulo, Painel, Selo, Campo } from "@/components/ui";

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
          <Painel titulo="Situação">
            {jaConvertida ? (
              <p className="text-sm text-slate-600">
                Já triada e convertida em{" "}
                <Link href={`/ordens/${s.ordem_id}`} className="font-medium text-marinho-700 hover:underline">
                  {s.ordem_numero}
                </Link>.
              </p>
            ) : podeTriar ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Esta solicitação ainda não foi triada.</p>
                <Link href={`/quadro?sel=${s.id}`}
                  className="inline-block rounded-md bg-marinho-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-marinho-800">
                  Triar no Quadro de atividades
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aguardando triagem.</p>
            )}
          </Painel>

        </div>
      </div>
    </div>
  );
}
