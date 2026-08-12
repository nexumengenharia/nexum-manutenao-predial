// ---------------------------------------------------------------------------
// Configuracao. Tudo que muda entre Fase 1 e Fase 2 passa por aqui.
// Nenhum modulo de negocio le process.env diretamente.
// ---------------------------------------------------------------------------

const REF = "fpbnixbasqnvjxinntfj";
const USUARIO = `manutencao_app.${REF}`;

// Papel dedicado da aplicacao: NOBYPASSRLS e sem privilegio de DELETE.
// A RLS do banco vale de fato, e nao apenas no papel (R3/R6).
// A senha NUNCA fica no codigo (violava a propria R3 deste arquivo ate
// 12/08/2026 — credencial exposta publicamente, ja rotacionada no Supabase).
// Vem só de DB_PASSWORD (ou DATABASE_URL pronta), variavel de ambiente.
// A lista de candidatos existe porque o prefixo do pooler compartilhado
// varia por projeto; db.ts tenta na ordem e fixa o primeiro que responder.
function candidatosBanco(): string[] {
  if (process.env.DATABASE_URL) return [process.env.DATABASE_URL];

  const senha = process.env.DB_PASSWORD;
  if (!senha) {
    throw new Error(
      "DATABASE_URL ou DB_PASSWORD precisa estar configurado como variável de ambiente " +
        "(.env.local, nunca commitado) — a senha do banco não pode voltar a viver no código (R3).",
    );
  }
  return [
    `postgresql://${USUARIO}:${senha}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://${USUARIO}:${senha}@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://${USUARIO}:${senha}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`,
  ];
}

export const config = {
  urlsBanco: candidatosBanco(),
  schema: "manutencao",
  segredoToken: process.env.AUTH_SECRET ?? "nx1-fase1-segredo-de-demonstracao-trocar-na-fase-2",
  duracaoSessaoHoras: 8,
  nomeCookie: "nx_sessao",

  // Segredo compartilhado com o Traccar. Sem ele, o endpoint de
  // ingestao recusa tudo — inclusive em ambiente de demonstracao.
  chaveIntegracao: process.env.CHAVE_INTEGRACAO
    ?? "nx1-traccar-demo-2026-trocar-antes-de-instalar-rastreador",
} as const;
