import { NextResponse } from "next/server";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import { responderChecklist } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const ctx = await contexto();
  if (!pode(ctx.sessao.papel, "ordem.editar")) {
    return NextResponse.json({ erro: "Seu perfil não permite responder o checklist." }, { status: 403 });
  }

  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  try {
    await responderChecklist(ctx, itemId, {
      resposta: corpo?.resposta ?? null,
      conforme: corpo?.conforme === true || corpo?.conforme === "true" ? true
              : corpo?.conforme === false || corpo?.conforme === "false" ? false : null,
      observacao: corpo?.observacao ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Não foi possível salvar a resposta." }, { status: 500 });
  }
}
