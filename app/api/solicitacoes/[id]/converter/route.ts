import { NextResponse } from "next/server";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import { consultarUm } from "@/lib/db";
import { criarOrdem } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Converte uma solicitacao triada em Ordem de Servico formal — com numero,
    descricao tecnica, prazo e (opcionalmente) contratada e ativo. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await contexto();

  if (!pode(ctx.sessao.papel, "solicitacao.triar")) {
    return NextResponse.json({ erro: "Seu perfil não permite converter solicitações em OS." }, { status: 403 });
  }

  const sol: any = await consultarUm(ctx,
    `select id, predio_id, setor_id, ativo_id, titulo, descricao, prioridade, situacao, ordem_id
       from manutencao.solicitacao
      where id = $1 and tenant_id = manutencao.tenant_atual() and excluido_em is null`, [id]);
  if (!sol) return NextResponse.json({ erro: "Solicitação não encontrada." }, { status: 404 });
  if (sol.ordem_id) return NextResponse.json({ erro: "Esta solicitação já foi convertida em OS." }, { status: 409 });

  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const { tipo, titulo, descricao, prioridade, contratadaId, ativoId, prazoHoras, custoEstimado } = corpo ?? {};
  if (!tipo || !titulo) {
    return NextResponse.json({ erro: "Preencha o tipo e o título da OS." }, { status: 400 });
  }

  try {
    const r = await criarOrdem(ctx, {
      predioId: sol.predio_id, setorId: sol.setor_id, ativoId: ativoId || sol.ativo_id || null,
      contratadaId: contratadaId || null, solicitacaoId: sol.id,
      titulo, descricao: descricao || sol.descricao || null, tipo,
      prioridade: prioridade || sol.prioridade || "MEDIA",
      prazoHoras: prazoHoras ? Number(prazoHoras) : null,
      custoEstimado: custoEstimado ? Number(custoEstimado) : null,
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.includes("violates check constraint") || e?.code === "23514") {
      return NextResponse.json({ erro: "Algum valor (tipo/prioridade) não é aceito." }, { status: 400 });
    }
    return NextResponse.json({ erro: "Não foi possível converter em OS." }, { status: 500 });
  }
}
