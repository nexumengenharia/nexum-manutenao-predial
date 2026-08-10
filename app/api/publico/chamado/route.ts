import { NextResponse } from "next/server";
import { abrirChamadoPublico } from "@/lib/servicos/acoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Abertura de chamado por QR de ATIVO. Sem sessao: o codigo publico do
    ativo e a unica credencial (ver abrirChamadoPublico). */
export async function POST(req: Request) {
  let corpo: any;
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const { codigo, titulo, descricao, solicitante, contato, prioridade } = corpo ?? {};
  if (!codigo || !titulo || !solicitante) {
    return NextResponse.json({ erro: "Informe o problema e o seu nome." }, { status: 400 });
  }

  try {
    const r = await abrirChamadoPublico(String(codigo), {
      titulo: String(titulo).slice(0, 120),
      descricao: descricao ? String(descricao).slice(0, 2000) : undefined,
      solicitante: String(solicitante).slice(0, 120),
      contato: contato ? String(contato).slice(0, 120) : undefined,
      prioridade: prioridade ? String(prioridade) : undefined,
    });
    return NextResponse.json({ ok: true, numero: r.numero });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg.includes("nao localizado") ? 404 : 500;
    return NextResponse.json({ erro: status === 404 ? "Ativo não encontrado." : "Não foi possível registrar o chamado." }, { status });
  }
}
