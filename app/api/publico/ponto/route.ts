import { NextResponse } from "next/server";
import { abrirChamadoPontoPublico } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NATUREZAS_VALIDAS = ["LIMPEZA", "MANUTENCAO", "SEGURANCA"];

/** Abertura de chamado por QR de PONTO de servico. Sem sessao: o codigo
    publico do ponto e a unica credencial (ver abrirChamadoPontoPublico). */
export async function POST(req: Request) {
  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const { codigo, natureza, titulo, descricao, solicitante, contato, prioridade } = corpo ?? {};
  if (!codigo || !titulo || !natureza) {
    return NextResponse.json({ erro: "Escolha o tipo de problema e descreva rapidamente." }, { status: 400 });
  }
  if (!NATUREZAS_VALIDAS.includes(String(natureza))) {
    return NextResponse.json({ erro: "Tipo de problema inválido." }, { status: 400 });
  }

  try {
    const r = await abrirChamadoPontoPublico(String(codigo), {
      natureza: String(natureza),
      titulo: String(titulo).slice(0, 120),
      descricao: descricao ? String(descricao).slice(0, 2000) : undefined,
      solicitante: solicitante ? String(solicitante).slice(0, 120) : undefined,
      contato: contato ? String(contato).slice(0, 120) : undefined,
      prioridade: prioridade ? String(prioridade) : undefined,
    });
    return NextResponse.json({ ok: true, numero: r.numero, equipe: r.equipe });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg.includes("nao localizado") ? 404 : 500;
    return NextResponse.json({ erro: status === 404 ? "Ponto não encontrado." : "Não foi possível registrar o chamado." }, { status });
  }
}
