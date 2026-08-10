import { NextResponse } from "next/server";
import { semContexto, enderecoEmUso } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verificacao de vida usada nos testes de implantacao. */
export async function GET() {
  const inicio = Date.now();
  try {
    const r = await semContexto(async (c) => {
      const { rows } = await c.query(
        `select current_user as papel,
                (select count(*) from manutencao.tribunal) as tribunais,
                (select count(*) from manutencao.ordem) as ordens,
                (select count(*) from manutencao.audit_log) as auditoria,
                current_setting('server_version') as postgres`);
      return rows[0];
    });
    return NextResponse.json({ ok: true, ms: Date.now() - inicio, endereco: enderecoEmUso(), ...r });
  } catch (e: any) {
    return NextResponse.json({ ok: false, erro: String(e?.message ?? e) }, { status: 500 });
  }
}
