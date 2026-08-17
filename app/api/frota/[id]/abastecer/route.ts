import { NextResponse } from "next/server";
import { contexto } from "@/lib/sessao";
import { pode } from "@/lib/auth";
import { registrarAbastecimento } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await contexto();
  if (!pode(ctx.sessao.papel, "frota.gerenciar")) {
    return NextResponse.json({ erro: "Seu perfil não permite registrar abastecimento." }, { status: 403 });
  }

  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const litros = Number(corpo?.litros);
  const valor = Number(corpo?.valor);
  if (!Number.isFinite(litros) || litros <= 0 || !Number.isFinite(valor) || valor < 0) {
    return NextResponse.json({ erro: "Informe litros (>0) e valor (>=0)." }, { status: 400 });
  }

  try {
    const r = await registrarAbastecimento(ctx, {
      veiculoId: id,
      data: corpo?.data || undefined,
      hodometro: corpo?.hodometro ? Number(corpo.hodometro) : null,
      litros, valor,
      combustivel: corpo?.combustivel || null,
      posto: corpo?.posto || null,
      motoristaId: corpo?.motoristaId || null,
      motoristaNome: corpo?.motoristaNome || ctx.sessao.nome,
      notaFiscal: corpo?.notaFiscal || null,
      observacoes: corpo?.observacoes || null,
    });
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    return NextResponse.json({ erro: "Não foi possível registrar o abastecimento." }, { status: 500 });
  }
}
