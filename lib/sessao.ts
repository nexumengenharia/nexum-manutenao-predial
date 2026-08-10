import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { config } from "./config";
import { lerToken, type Sessao } from "./auth";
import type { Contexto } from "./db";

export async function sessaoAtual(): Promise<Sessao | null> {
  const jar = await cookies();
  const token = jar.get(config.nomeCookie)?.value;
  if (!token) return null;
  return lerToken(token);
}

export async function exigirSessao(): Promise<Sessao> {
  const s = await sessaoAtual();
  if (!s) redirect("/login");
  return s;
}

export async function ipDaRequisicao(): Promise<string | null> {
  const h = await headers();
  const xf = h.get("x-forwarded-for");
  return xf ? xf.split(",")[0]!.trim() : h.get("x-real-ip");
}

export async function contexto(): Promise<Contexto & { sessao: Sessao }> {
  const sessao = await exigirSessao();
  return {
    sessao,
    tenantId: sessao.tenantId,
    usuarioId: sessao.usuarioId,
    ip: await ipDaRequisicao(),
  };
}
