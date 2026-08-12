# 📋 Prompt para outra conta Claude — nexum-manutenção-predial

**Para copiar e colar na primeira mensagem da conversa numa outra conta Claude (quando créditos acabarem).**

---

## CONTEXTO PORTÁTIL — nexum-manutenção-predial

**Projeto:** Aplicativo de gestão de manutenção predial — **produto de carteira da Nexum**.  
**Repositório:** `https://github.com/nexumengenharia/nexum-manutenao-predial` (público)  
**Stack:** Next.js 15 + React 19 + TypeScript + Tailwind v3 + Postgres (Supabase compartilhado)  
**Banco:** Supabase projeto `fpbnixbasqnvjxinntfj` (schema `manutencao`, compartilhado com outros sistemas Nexum)  
**Essa máquina:** Windows 11, pasta local: `C:\Users\NILTON TRADER\OneDrive\Área de Trabalho\NILTON\APP INSP\Aplicativo 2.0\nexum-manutenao-predial`

### Arquitetura — padrão NX-1, Fase 1

Estamos na **FASE 1**: hospedagem em Supabase + Vercel, por custo e velocidade. A estratégia NX-1 define 11 regras invioláveis que mantêm o código portável pra Fase 2 (Docker/nuvem nacional, sem reescrever lógica de negócio).

**REGRAS INVIOLÁVEIS — recuse qualquer código que as viole:**
1. Schema só muda por migration versionada — nunca pelo painel.
2. Frontend nunca fala com o banco direto — só via API.
3. `service_role` só no servidor — nunca no frontend, nunca em variável de build.
4. Toda tabela tem: `id`, `tenant_id`, `criado_em`, `criado_por`, `atualizado_em`, `atualizado_por`, `excluido_em`.
5. Nunca `auth.users` — use a tabela `usuario` própria, com `provedor_id`.
6. RLS policies usam `app_tenant_id()` / `current_setting('app.tenant_id')`, nunca `auth.uid()`.
7. Zero regra de negócio em Edge Function — procesos longos usam `pg-boss`.
8. Arquivos só pela interface de storage da API (implementações Supabase + MinIO interchangeáveis).
9. Dependência nova só entra se rodar offline no servidor do órgão (sem internet externa).
10. Toda escrita em transação com `SET LOCAL app.usuario_id/app.tenant_id/app.ip` + `audit_log` com ator identificado.
11. Nunca `DELETE` em tabela de negócio — use `excluido_em` (soft-delete).

**Nunca escreva SQL fora de migration. Nunca commit direto na `main`** — o plano Hobby da Vercel bloqueia deploy de autores não-colaboradores; use PR + squash-merge.

### Estado atual do projeto

Veja os arquivos nesta ordem pra entender onde estamos:

1. **`AVALIACAO-PROVA-DE-CONCEITO.md`** — documento de avaliação e escopo (o que o projeto faz)
2. **`lib/config.ts`** — configuração centralizada (URLs, schema, segredos) — **CRÍTICO: RECENTEMENTE CORRIGIDO de uma exposição de credencial, veja `INCIDENTE-SEGURANCA-12-08-2026.md`**
3. **`lib/db.ts`** — conexão ao Postgres (pool, contexto de transação com auditoria)
4. **`INCIDENTE-SEGURANCA-12-08-2026.md`** — registro de um incidente: senha do banco estava literal em código (público), já removida. Pendente: rotacionar a senha no painel Supabase.

Estrutura de módulos:
- `app/(app)/` — páginas protegidas (requerem autenticação)
- `app/api/` — endpoints de API (auth, cadastros, integrações, etc.)
- `app/login` — página de login
- `components/` — componentes React reutilizáveis
- `lib/` — utilitários (config, banco, formatação, etc.)

### GitHub + credenciais

**Conta GitHub:** `nexumengenharia` (organização) — sempre use isso pra commits/PR, nunca a pessoal.  
**Supabase:** acesse em `supabase.com` com credenciais do Bitwarden (`docs/CONTAS.md` — arquivo de documentação não-versionado, leia localmente).  
**`.env.local`:** nunca versionado (`.gitignore`). Precisa de:
- `DATABASE_URL` ou `DB_PASSWORD` — senha do papel `manutencao_app.fpbnixbasqnvjxinntfj` (guarde no Bitwarden)
- `AUTH_SECRET` — chave de sesão JWT (trocar pra algo seguro em produção; hoje é demo)
- `CHAVE_INTEGRACAO` — segredo compartilhado com Traccar (demo; trocar antes de ligar rastreador real)

### Ritual de fim de sessão (OBRIGATÓRIO)

Antes de encerrar QUALQUER sessão:
1. `git add` + `git commit` do que foi feito.
2. `git push` (nunca deixe código só local).
3. Se pronto pra `main`, abra PR (sqash-merge, delete branch remota).
4. Atualize o `STATUS.md` (se este projeto tiver um) ou este documento: o que foi feito hoje + tarefa seguinte.

---

## CHECKLIST — Preparar a máquina nova

Execute nesta ordem:

1. **Instalar ferramentas:**
   ```
   git --version
   node --version (deve ser LTS; conferir package.json)
   npm install -g typescript
   ```

2. **Clonar o repositório:**
   ```
   git clone https://github.com/nexumengenharia/nexum-manutenao-predial.git
   cd nexum-manutenao-predial
   git log --oneline -3
   ```

3. **Autenticar o `gh` CLI:**
   ```
   gh auth login
   # Entre com `nexumengenharia` (a conta que é colaboradora na Vercel Hobby plan)
   ```
   Se quiser manter duas identidades (pessoal + org), rode de novo:
   ```
   gh auth login
   gh auth switch --user nexumengenharia  # Volta pra org antes de push
   ```

4. **Instalar dependências:**
   ```
   npm install
   ```

5. **Criar `.env.local` (NÃO COMITAR):**
   ```
   DATABASE_URL=postgresql://manutencao_app.fpbnixbasqnvjxinntfj:<SENHA>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   # OU
   DB_PASSWORD=<SENHA>
   
   AUTH_SECRET=nx1-fase1-segredo-demo-trocar-em-producao
   CHAVE_INTEGRACAO=nx1-traccar-demo-2026-trocar-antes-de-instalar
   ```
   **Não** copie a senha por chat. Pegue no Bitwarden → projeto Supabase fpbnixbasqnvjxinntfj → papel manutencao_app.

6. **Subir e testar:**
   ```
   npm run dev
   # Abrir http://localhost:3000 (ou a porta que o terminal mostrar)
   # Logar com credenciais de teste (ver AVALIACAO-PROVA-DE-CONCEITO.md)
   ```

7. **Type-check:**
   ```
   npm run typecheck
   ```

---

## Como continue de onde parou

Você vai receber este prompt numa outra conta Claude. Quando entrar:

1. **Leia este arquivo inteiro** — é seu mapa.
2. **Faça o checklist acima** — seu ambiente fica pronto.
3. **Pergunte ao Claude (essa nova sessão) "qual é a próxima tarefa"** — ele vai olhar o `git log`, o `status`, e sugerir o que fazer.
4. **Trabalhe normalmente** — commit, push, abra PR quando terminar.
5. **Ao final**, atualize este arquivo com o que foi feito e qual tarefa vem depois — passa pro próximo Claude.

---

## O que o Claude novo pode fazer pra você

Com este contexto, o Claude da nova conta consegue:

✅ **Entender a arquitetura** — sabe o padrão NX-1, as 11 regras, por que o banco é compartilhado, como a autenticação funciona.

✅ **Navegar o código** — sabe onde estão os endpoints, como as migrations funcionam, qual é o padrão de transação com auditoria.

✅ **Guiar no que fazer** — vai ler o `git log` e o estado do repositório, e dizer qual é a próxima tarefa lógica.

✅ **Corrigir problemas de segurança** — sabe que credenciais nunca ficam em código, que toda escrita precisa de auditoria, que a RLS é critical.

✅ **Abrir PR direito** — commit message formato `tipo(escopo): msg`, squash-merge na `main`, delete branch remota.

✅ **Trabalhar com você em novo módulo** — se quiser adicionar uma nova página ou API, vai sugerir o padrão, avisar sobre RLS, checklist de entrega.

---

## Dúvidas? Cole este arquivo inteiro no chat novo

Não tente resumir. Cola tudo. O Claude novo precisa de **todo** este contexto pra conseguir te guiar — GitHub, credenciais, arquitetura, incidentes passados, tudo junto.

Se precisar adicionar algo novo a este documento (descobrir um padrão novo, uma ferramenta que só funciona com certa versão, um endpoint crítico não documentado), **edite este arquivo, commita, faz push** — a próxima conta pega automaticamente.

---

**Última atualização:** 12/08/2026  
**Status:** Pronto pra ser copiado pro outro chat  
**Pré-requisito crítico:** Rotacionar a senha no Supabase (veja `INCIDENTE-SEGURANCA-12-08-2026.md`)
