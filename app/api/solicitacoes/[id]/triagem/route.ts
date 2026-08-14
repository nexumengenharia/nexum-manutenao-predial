import { NextResponse } from "next/server";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import { definirPrioridadeSolicitacao } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIORIDADES = ["URGENTE", "ALTA", "MEDIA", "BAIXA"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await contexto();
  if (!pode(ctx.sessao.papel, "solicitacao.triar")) {
    return NextResponse.json({ erro: "Seu perfil não permite triar solicitações." }, { status: 403 });
  }

  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }
  const { prioridade } = corpo ?? {};
  if (!PRIORIDADES.includes(prioridade)) {
    return NextResponse.json({ erro: "Prioridade inválida." }, { status: 400 });
  }

  try {
    const r = await definirPrioridadeSolicitacao(ctx, id, prioridade);
    return NextResponse.json({ ok: true, ...r });
  } catch {
    return NextResponse.json({ erro: "Não foi possível salvar a triagem." }, { status: 500 });
  }
}
