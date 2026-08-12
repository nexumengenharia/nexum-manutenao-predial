import { NextResponse } from "next/server";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import { criarControle } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await contexto();
  if (!pode(ctx.sessao.papel, "cadastro.editar")) {
    return NextResponse.json({ erro: "Seu perfil não permite cadastrar controles." }, { status: 403 });
  }

  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const { alvoTipo, alvoId, nome, tipo, norma, periodicidadeMeses, ultimaData,
          proximaData, custoPrevisto, geraOrdem } = corpo ?? {};

  if (!alvoTipo || !alvoId || !nome || !tipo || !proximaData) {
    return NextResponse.json({ erro: "Preencha o alvo, nome, tipo e a próxima data." }, { status: 400 });
  }

  try {
    const r = await criarControle(ctx, {
      alvoTipo, alvoId, nome, tipo, norma: norma || null,
      periodicidadeMeses: periodicidadeMeses ? Number(periodicidadeMeses) : null,
      ultimaData: ultimaData || null, proximaData,
      custoPrevisto: custoPrevisto ? Number(custoPrevisto) : null,
      geraOrdem: geraOrdem === true || geraOrdem === "on" || geraOrdem === "true",
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.includes("violates check constraint") || e?.code === "23514") {
      return NextResponse.json({ erro: "Algum valor não é aceito (verifique o tipo informado)." }, { status: 400 });
    }
    if (msg.includes("violates foreign key") || e?.code === "23503") {
      return NextResponse.json({ erro: "Selecione um alvo (ativo/prédio/contratada/veículo/ponto) válido." }, { status: 400 });
    }
    return NextResponse.json({ erro: "Não foi possível cadastrar o controle." }, { status: 500 });
  }
}
