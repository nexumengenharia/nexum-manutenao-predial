import { Pool, type PoolClient } from "pg";
import { config } from "./config";

// Postgres numeric -> string por padrao no node-postgres. Para dinheiro isso
// e o comportamento correto (nao perde centavos); convertemos so na borda.
declare global {
  var __nx_pool: Pool | undefined;
  var __nx_url: string | undefined;
}

function criarPool(url: string) {
  return new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
}

/**
 * Resolve a conexao uma unica vez por instancia. Se houver mais de um
 * candidato (prefixo do pooler compartilhado), testa na ordem e fixa o
 * primeiro que responder.
 */
async function obterPool(): Promise<Pool> {
  if (global.__nx_pool) return global.__nx_pool;

  let ultimoErro: unknown = null;
  for (const url of config.urlsBanco) {
    const p = criarPool(url);
    try {
      const c = await p.connect();
      await c.query("select 1");
      c.release();
      global.__nx_pool = p;
      global.__nx_url = url.replace(/:[^:@]+@/, ":***@");
      return p;
    } catch (e) {
      ultimoErro = e;
      await p.end().catch(() => {});
    }
  }
  throw new Error(
    `Nao foi possivel conectar ao banco em nenhum endereco configurado. Ultimo erro: ${String(ultimoErro)}`,
  );
}

export type Contexto = {
  tenantId: string;
  usuarioId?: string | null;
  ip?: string | null;
};

/**
 * R10 — toda leitura e escrita roda em transacao com o contexto aplicado.
 * SET LOCAL alimenta as policies de RLS (R6) e o gatilho de auditoria.
 */
export async function comContexto<T>(
  ctx: Contexto,
  fn: (c: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = await obterPool();
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('app.tenant_id', $1, true)", [ctx.tenantId]);
    await c.query("select set_config('app.usuario_id', $1, true)", [ctx.usuarioId ?? ""]);
    await c.query("select set_config('app.ip', $1, true)", [ctx.ip ?? ""]);
    const r = await fn(c);
    await c.query("commit");
    return r;
  } catch (e) {
    try { await c.query("rollback"); } catch { /* conexao ja perdida */ }
    throw e;
  } finally {
    c.release();
  }
}

/** Consulta sem tenant: apenas login e paginas publicas por token. */
export async function semContexto<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const pool = await obterPool();
  const c = await pool.connect();
  try { return await fn(c); } finally { c.release(); }
}

export function enderecoEmUso() { return global.__nx_url ?? "(nao conectado)"; }

export async function consultar<T = any>(ctx: Contexto, sql: string, params: any[] = []): Promise<T[]> {
  return comContexto(ctx, async (c) => (await c.query(sql, params)).rows as T[]);
}

export async function consultarUm<T = any>(ctx: Contexto, sql: string, params: any[] = []): Promise<T | null> {
  const linhas = await consultar<T>(ctx, sql, params);
  return linhas[0] ?? null;
}
