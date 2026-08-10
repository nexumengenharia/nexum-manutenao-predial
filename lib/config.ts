// ---------------------------------------------------------------------------
// Configuracao. Tudo que muda entre Fase 1 e Fase 2 passa por aqui.
// Nenhum modulo de negocio le process.env diretamente.
// ---------------------------------------------------------------------------

const REF = "fpbnixbasqnvjxinntfj";
const USUARIO = `manutencao_app.${REF}`;
const SENHA = "2Q8pzckUA91g9RlaW1GhuhxdSLxvR5WQ";

// Papel dedicado da aplicacao: NOBYPASSRLS e sem privilegio de DELETE.
// A RLS do banco vale de fato, e nao apenas no papel (R3/R6).
// A lista existe porque o prefixo do pooler compartilhado varia por projeto;
// db.ts tenta na ordem e fixa o primeiro que responder.
const CANDIDATOS = [
  `postgresql://${USUARIO}:${SENHA}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://${USUARIO}:${SENHA}@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://${USUARIO}:${SENHA}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`,
];

export const config = {
  urlsBanco: process.env.DATABASE_URL ? [process.env.DATABASE_URL] : CANDIDATOS,
  schema: "manutencao",
  segredoToken: process.env.AUTH_SECRET ?? "nx1-fase1-segredo-de-demonstracao-trocar-na-fase-2",
  duracaoSessaoHoras: 8,
  nomeCookie: "nx_sessao",

  // Segredo compartilhado com o Traccar. Sem ele, o endpoint de
  // ingestao recusa tudo — inclusive em ambiente de demonstracao.
  chaveIntegracao: process.env.CHAVE_INTEGRACAO
    ?? "nx1-traccar-demo-2026-trocar-antes-de-instalar-rastreador",
} as const;
