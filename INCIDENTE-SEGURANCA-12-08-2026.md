# 🚨 Incidente de Segurança — 12/08/2026

**Status:** Código corrigido | Senha antiga em rotação (PENDENTE)

## O que aconteceu

O arquivo `lib/config.ts` continha a senha real do banco de dados (Postgres) gravada como constante literal no código-fonte:

```typescript
const SENHA = "2Q8pzckUA91g9RlaW1GhuhxdSLxvR5WQ";
```

Esse arquivo estava versionado no Git e publicado num repositório **público** do GitHub (`nexumengenharia/nexum-manutenao-predial`), expondo a credencial para qualquer pessoa na internet.

**Histórico:**
- Commit original: `622e748` (12/08/2026, ainda antes da descoberta)
- Já estava no `origin/main` quando descoberto

## Ação tomada (imediata)

**Commit `2c7125d`** removeu a senha do código e refatorou `lib/config.ts` para exigir a credencial como variável de ambiente (`DATABASE_URL` ou `DB_PASSWORD`), nunca no código:

```typescript
function candidatosBanco(): string[] {
  if (process.env.DATABASE_URL) return [process.env.DATABASE_URL];
  
  const senha = process.env.DB_PASSWORD;
  if (!senha) {
    throw new Error(
      "DATABASE_URL ou DB_PASSWORD precisa estar configurado como variável de ambiente " +
        "(.env.local, nunca commitado) — a senha do banco não pode voltar a viver no código (R3)."
    );
  }
  // ...
}
```

## Ação pendente (essencial)

**A senha antiga `2Q8pzckUA91g9RlaW1GhuhxdSLxvR5WQ` deve ser considerada comprometida** e precisa ser **rotacionada imediatamente** no painel do Supabase, mesmo que o código agora não a use mais.

### Como fazer:
1. Abrir o painel do Supabase → projeto `fpbnixbasqnvjxinntfj`.
2. Ir para **Database → Roles**.
3. Achar o papel `manutencao_app.fpbnixbasqnvjxinntfj`.
4. Clicar em **Reset Password** (ou opção equivalente).
5. Copiar a nova senha.
6. Guardar a senha nova **no Bitwarden** (nunca em arquivo, nunca em chat).
7. Configurar `.env.local` local com `DB_PASSWORD=<nova-senha>` (nunca commitar).
8. Se o app estiver deployado (Vercel), atualizar a variável de ambiente `DB_PASSWORD` lá também.

## Impacto

- **Código:** sem regressão — todas as chamadas ao banco continuam funcionando, a senha agora vem de variável de ambiente em vez de constante.
- **Segurança:** a senha antiga é válida até ser trocada no Supabase, então qualquer pessoa que clone o repo e tenha acesso ao histórico do Git consegue ler ela. **É crítico trocar agora.**
- **Reprodução:** impossível repetir — o padrão de "senha em código" agora é bloqueado por erro explícito se a variável de ambiente não estiver configurada.

## Checklist

- [x] Código corrigido e enviado (`2c7125d` no GitHub)
- [ ] Senha antiga rotacionada no Supabase
- [ ] `.env.local` configurado localmente com a nova senha
- [ ] Vercel atualizado com a nova senha (se deployado)

---

**Registrado por:** Claude Code  
**Data:** 12/08/2026  
**Repositório afetado:** `nexumengenharia/nexum-manutenao-predial`  
**Projeto Supabase:** `fpbnixbasqnvjxinntfj` (schema `manutencao`)
