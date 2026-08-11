import { NextResponse } from "next/server";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import { mudarSituacaoOrdem } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALIDAS = ["ABERTA", "EM_EXECUCAO", "AGUARDANDO_PECA", "CONCLUIDA", "CANCELADA"];

const numero = (v: any, max?: number) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return max !== undefined && n > max ? max : n;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await contexto();

  if (!pode(ctx.sessao.papel, "ordem.concluir")) {
    return NextResponse.json({ erro: "Seu perfil não permite alterar ordens." }, { status: 403 });
  }

  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const { situacao, custoReal, horas, nota, parecer } = corpo ?? {};
  if (!VALIDAS.includes(String(situacao))) {
    return NextResponse.json({ erro: "Situação inválida." }, { status: 400 });
  }

  try {
    const r = await mudarSituacaoOrdem(ctx, id, String(situacao), {
      custoReal: numero(custoReal),
      horas: numero(horas),
      nota: numero(nota, 5),
      parecer: parecer ? String(parecer).slice(0, 2000) : null,
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.includes("nao encontrada")) {
      return NextResponse.json({ erro: "Ordem não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ erro: "Não foi possível atualizar a ordem." }, { status: 500 });
  }
}
