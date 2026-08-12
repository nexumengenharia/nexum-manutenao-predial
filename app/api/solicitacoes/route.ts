import { NextResponse } from "next/server";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import { criarSolicitacaoInterna } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Abertura manual de solicitacao pelo gestor/fiscal (chamado relatado por
    telefone, presencialmente etc — sem passar pelo QR code). */
export async function POST(req: Request) {
  const ctx = await contexto();
  if (!pode(ctx.sessao.papel, "solicitacao.triar")) {
    return NextResponse.json({ erro: "Seu perfil não permite registrar solicitações." }, { status: 403 });
  }

  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const { predioId, setorId, pontoId, ativoId, equipeId, natureza, titulo, descricao,
          prioridade, solicitanteNome, solicitanteContato } = corpo ?? {};

  if (!predioId || !natureza || !titulo || !solicitanteNome) {
    return NextResponse.json({ erro: "Preencha prédio, natureza, título e nome do solicitante." }, { status: 400 });
  }

  try {
    const r = await criarSolicitacaoInterna(ctx, {
      predioId, setorId: setorId || null, pontoId: pontoId || null, ativoId: ativoId || null,
      equipeId: equipeId || null, natureza, titulo, descricao: descricao || null,
      prioridade: prioridade || "MEDIA", solicitanteNome, solicitanteContato: solicitanteContato || null,
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.includes("violates check constraint") || e?.code === "23514") {
      return NextResponse.json({ erro: "Algum valor selecionado (natureza/prioridade) não é aceito." }, { status: 400 });
    }
    if (msg.includes("violates foreign key") || e?.code === "23503") {
      return NextResponse.json({ erro: "Selecione um prédio/ponto/ativo válido." }, { status: 400 });
    }
    return NextResponse.json({ erro: "Não foi possível registrar a solicitação." }, { status: 500 });
  }
}
