-- Rodar no SQL Editor do Supabase, uma vez, antes de fazer deploy do codigo.
-- Adiciona classificacao de execucao na Ordem de Servico: interna manutencao,
-- interna zeladoria ou externa (contratada). Definida na triagem do Quadro.

alter table manutencao.ordem
  add column if not exists execucao text
    check (execucao in ('INTERNA_MANUTENCAO', 'INTERNA_ZELADORIA', 'EXTERNA'));

-- OS antigas sem classificacao: assumimos que as que tem contratada sao
-- EXTERNA, o resto vira INTERNA_MANUTENCAO. Ninguem fica sem valor.
update manutencao.ordem
   set execucao = case
     when contratada_id is not null then 'EXTERNA'
     else 'INTERNA_MANUTENCAO'
   end
 where execucao is null;

-- Indice para filtrar rapido na tela de execucao (empresa x tipo).
create index if not exists ix_ordem_execucao on manutencao.ordem (tenant_id, execucao)
  where excluido_em is null;
