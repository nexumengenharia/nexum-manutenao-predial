import { NextResponse } from "next/server";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import { triarSolicitacao } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITUACOES_VALIDAS = ["ABERTA", "TRIAGEM", "EM_EXECUCAO", "CONCLUIDA", "CANCELADA"];

/** Move um card do quadro de atividades para outra situacao. Usado pelo
    componente app/(app)/quadro/mover.tsx. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await contexto();

  if (!pode(ctx.sessao.papel, "solicitacao.triar")) {
    return NextResponse.json({ erro: "Sem permissão para mover chamados." }, { status: 403 });
  }

  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const { situacao } = corpo ?? {};
  if (!SITUACOES_VALIDAS.includes(String(situacao))) {
    return NextResponse.json({ erro: "Situação inválida." }, { status: 400 });
  }

  try {
    await triarSolicitacao(ctx, id, String(situacao));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ erro: "Não foi possível mover o chamado." }, { status: 500 });
  }
}
