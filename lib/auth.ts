import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config";
import { semContexto } from "./db";

export type Sessao = {
  usuarioId: string;
  tenantId: string;
  nome: string;
  email: string;
  papel: Papel;
  tribunal: string;
  tribunalNome: string;
};

export type Papel = "ADMIN" | "GESTOR" | "FISCAL" | "TECNICO" | "CONTRATADA" | "CONSULTA";

const chave = new TextEncoder().encode(config.segredoToken);

export async function emitirToken(s: Sessao): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("nexum-manutencao")
    .setExpirationTime(`${config.duracaoSessaoHoras}h`)
    .sign(chave);
}

export async function lerToken(token: string): Promise<Sessao | null> {
  try {
    const { payload } = await jwtVerify(token, chave, { issuer: "nexum-manutencao" });
    return payload as unknown as Sessao;
  } catch {
    return null;
  }
}

export type ResultadoLogin =
  | { ok: true; sessao: Sessao }
  | { ok: false; motivo: string };

/**
 * Autenticacao. Fase 2: este arquivo e substituido pela validacao do token
 * do Keycloak; usuario.provedor_id ja existe para receber o subject externo.
 *
 * A busca do usuario por e-mail precisa acontecer ANTES de sabermos o tenant,
 * entao nao da para rodar sob RLS normal (que exige app.tenant_id setado).
 * Por isso a leitura e a escrita de tentativas/bloqueio passam por functions
 * security definer estreitas (manutencao.login_*), criadas na migration
 * mnt_0008 -- elas nao abrem select livre nas tabelas para o papel da
 * aplicacao, so expoem exatamente o que o login precisa.
 */
export async function autenticar(
  email: string,
  senha: string,
  ip: string | null,
  agente: string | null,
): Promise<ResultadoLogin> {
  const emailNorm = email.trim().toLowerCase();

  return semContexto(async (c) => {
    const { rows } = await c.query(
      `select * from manutencao.login_buscar($1)`,
      [emailNorm],
    );

    const registrar = async (uid: string | null, tid: string | null, ok: boolean, motivo: string | null) => {
      await c.query(
        `insert into manutencao.log_acesso (tenant_id, usuario_id, email, sucesso, motivo, ip, agente)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [tid, uid, emailNorm, ok, motivo, ip, agente],
      );
    };

    const u = rows[0];
    if (!u || !u.senha_hash) {
      await registrar(null, null, false, "USUARIO_INEXISTENTE");
      return { ok: false, motivo: "Credenciais invalidas." };
    }
    if (!u.ativo) {
      await registrar(u.usuario_id, u.tenant_id, false, "USUARIO_INATIVO");
      return { ok: false, motivo: "Usuario inativo. Procure o administrador." };
    }
    if (u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date()) {
      await registrar(u.usuario_id, u.tenant_id, false, "BLOQUEADO");
      return { ok: false, motivo: "Acesso bloqueado temporariamente por tentativas consecutivas." };
    }

    const confere = await bcrypt.compare(senha, u.senha_hash);
    if (!confere) {
      const n = (u.tentativas_falhas ?? 0) + 1;
      await c.query(`select manutencao.login_atualizar_tentativas($1, $2, $3)`, [u.usuario_id, n, n >= 5]);
      await registrar(u.usuario_id, u.tenant_id, false, "SENHA_INCORRETA");
      return { ok: false, motivo: "Credenciais invalidas." };
    }

    await c.query(`select manutencao.login_sucesso($1)`, [u.usuario_id]);
    await registrar(u.usuario_id, u.tenant_id, true, null);

    return {
      ok: true,
      sessao: {
        usuarioId: u.usuario_id,
        tenantId: u.tenant_id,
        nome: u.nome,
        email: u.email,
        papel: u.papel as Papel,
        tribunal: u.sigla,
        tribunalNome: u.tribunal_nome,
      },
    };
  });
}

// -------------------------------------------------------------- autorizacao
const PERMISSOES: Record<string, Papel[]> = {
  "ordem.criar":      ["ADMIN", "GESTOR", "FISCAL"],
  "ordem.editar":     ["ADMIN", "GESTOR", "FISCAL", "TECNICO"],
  "ordem.concluir":   ["ADMIN", "GESTOR", "FISCAL", "TECNICO"],
  "ordem.excluir":    ["ADMIN", "GESTOR"],
  "solicitacao.triar":["ADMIN", "GESTOR", "FISCAL"],
  "cadastro.editar":  ["ADMIN", "GESTOR"],
  "medicao.gerenciar":["ADMIN", "GESTOR"],
  "medicao.atestar":  ["ADMIN", "FISCAL"],
  "usuario.gerenciar":["ADMIN"],
  "auditoria.ver":    ["ADMIN", "GESTOR", "FISCAL"],
  "comentario.criar": ["ADMIN", "GESTOR", "FISCAL", "TECNICO", "CONTRATADA"],
  "controle.gerenciar":["ADMIN", "GESTOR", "FISCAL"],
  "frota.ver":       ["ADMIN", "GESTOR", "FISCAL", "TECNICO"],
  "frota.gerenciar": ["ADMIN", "GESTOR"],
  "ponto.gerenciar": ["ADMIN", "GESTOR"],
};

export function pode(papel: Papel | undefined, acao: keyof typeof PERMISSOES | string): boolean {
  if (!papel) return false;
  const permitidos = PERMISSOES[acao];
  return permitidos ? permitidos.includes(papel) : false;
}
