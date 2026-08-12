import { NextResponse } from "next/server";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import { movimentarEstoque } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await contexto();
  if (!pode(ctx.sessao.papel, "cadastro.editar")) {
    return NextResponse.json({ erro: "Seu perfil não permite movimentar o estoque." }, { status: 403 });
  }

  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const { itemId, tipo, quantidade, motivo } = corpo ?? {};
  if (!itemId || !["ENTRADA", "SAIDA", "AJUSTE"].includes(tipo) || quantidade == null) {
    return NextResponse.json({ erro: "Informe item, tipo (entrada/saída/ajuste) e quantidade." }, { status: 400 });
  }
  const qtd = Number(quantidade);
  if (!Number.isFinite(qtd) || qtd < 0) {
    return NextResponse.json({ erro: "Quantidade inválida." }, { status: 400 });
  }

  try {
    const r = await movimentarEstoque(ctx, itemId, tipo, qtd, motivo || undefined);
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.includes("Saida maior")) {
      return NextResponse.json({ erro: "Saída maior que o saldo disponível." }, { status: 400 });
    }
    if (msg.includes("Item inexistente")) {
      return NextResponse.json({ erro: "Item não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ erro: "Não foi possível movimentar o item." }, { status: 500 });
  }
}
