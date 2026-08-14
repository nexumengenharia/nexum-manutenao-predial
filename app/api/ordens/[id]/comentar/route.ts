import { NextResponse } from "next/server";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import { comentar } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await contexto();
  if (!pode(ctx.sessao.papel, "comentario.criar")) {
    return NextResponse.json({ erro: "Seu perfil não permite comentar." }, { status: 403 });
  }

  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const texto = String(corpo?.texto ?? "").trim();
  if (!texto) return NextResponse.json({ erro: "Escreva um comentário." }, { status: 400 });

  try {
    const r = await comentar(ctx, "ordem", id, ctx.sessao.nome, texto);
    return NextResponse.json({ ok: true, ...r });
  } catch {
    return NextResponse.json({ erro: "Não foi possível salvar o comentário." }, { status: 500 });
  }
}
