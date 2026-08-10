import { NextResponse } from "next/server";
import { autenticar, emitirToken } from "@/lib/auth";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let corpo: { email?: string; senha?: string };
  try { corpo = await req.json(); } catch { return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 }); }

  const { email, senha } = corpo;
  if (!email || !senha) return NextResponse.json({ erro: "Informe e-mail e senha." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const agente = req.headers.get("user-agent");

  try {
    const r = await autenticar(email, senha, ip, agente);
    if (!r.ok) return NextResponse.json({ erro: r.motivo }, { status: 401 });

    const token = await emitirToken(r.sessao);
    const res = NextResponse.json({ ok: true, tribunal: r.sessao.tribunal });
    res.cookies.set(config.nomeCookie, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: config.duracaoSessaoHoras * 3600,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { erro: "Falha ao consultar a base de dados.", detalhe: String(e?.message ?? e).slice(0, 200) },
      { status: 500 },
    );
  }
}
