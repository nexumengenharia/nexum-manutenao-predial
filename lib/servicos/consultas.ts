import { consultar, consultarUm, type Contexto } from "../db";

/* -------------------------------------------------------------------------
   Camada de consulta. Nao importa nada do Next: na Fase 2 estes modulos sao
   embrulhados por Express sem alteracao (R2/R9).
   Todas as consultas ja chegam filtradas por RLS; o WHERE tenant_id que
   aparece aqui e redundancia proposital (defesa em profundidade).
------------------------------------------------------------------------- */

export async function resumoPainel(ctx: Contexto) {
  return consultarUm(ctx, `
    select
      (select count(*) from manutencao.predio where tenant_id=$1 and excluido_em is null) as predios,
      (select count(*) from manutencao.ativo  where tenant_id=$1 and excluido_em is null) as ativos,
      (select count(*) from manutencao.ordem  where tenant_id=$1 and excluido_em is null
         and situacao in ('ABERTA','EM_EXECUCAO','AGUARDANDO_PECA'))                      as ordens_abertas,
      (select count(*) from manutencao.vw_ordem_sla where tenant_id=$1 and atrasada)      as ordens_atrasadas,
      (select count(*) from manutencao.solicitacao where tenant_id=$1 and excluido_em is null
         and situacao in ('ABERTA','TRIAGEM'))                                            as solicitacoes_pendentes,
      (select count(*) from manutencao.item_estoque where tenant_id=$1 and excluido_em is null
         and quantidade_minima is not null and quantidade <= quantidade_minima)           as estoque_critico,
      (select coalesce(sum(custo_real),0) from manutencao.ordem where tenant_id=$1
         and situacao='CONCLUIDA' and concluida_em >= date_trunc('month', now()))         as custo_mes,
      (select coalesce(sum(custo_real),0) from manutencao.ordem where tenant_id=$1
         and situacao='CONCLUIDA' and concluida_em >= date_trunc('year', now()))          as custo_ano,
      (select round(100.0 * count(*) filter (where dentro_prazo)
              / nullif(count(*) filter (where dentro_prazo is not null),0), 1)
         from manutencao.vw_ordem_sla
        where tenant_id=$1 and situacao='CONCLUIDA'
          and concluida_em >= now() - interval '90 days')                                 as sla_90d,
      (select round(avg(nota_qualidade),2) from manutencao.ordem
        where tenant_id=$1 and nota_qualidade is not null
          and concluida_em >= now() - interval '180 days')                                as nota_media
  `, [ctx.tenantId]);
}

export const custoPorMes = (ctx: Contexto) => consultar(ctx, `
  select competencia, ordens, custo_total
    from manutencao.vw_custo_por_mes
   where tenant_id=$1 and competencia >= to_char(now() - interval '11 months','YYYY-MM')
   order by competencia`, [ctx.tenantId]);

export const custoPorPredio = (ctx: Contexto) => consultar(ctx, `
  select predio_nome, ordens, custo_total
    from manutencao.vw_custo_por_predio where tenant_id=$1
   order by custo_total desc`, [ctx.tenantId]);

export const custoPorSetor = (ctx: Contexto) => consultar(ctx, `
  select setor_nome, predio_nome, centro_custo, ordens, custo_total
    from manutencao.vw_custo_por_setor where tenant_id=$1
   order by custo_total desc limit 25`, [ctx.tenantId]);

export const ordensPorTipo = (ctx: Contexto) => consultar(ctx, `
  select tipo, count(*)::int as total,
         coalesce(sum(custo_real),0) as custo
    from manutencao.ordem
   where tenant_id=$1 and excluido_em is null
   group by tipo order by total desc`, [ctx.tenantId]);

export const ordensPorSituacao = (ctx: Contexto) => consultar(ctx, `
  select situacao, count(*)::int as total
    from manutencao.ordem where tenant_id=$1 and excluido_em is null
   group by situacao order by total desc`, [ctx.tenantId]);

export const alertas = (ctx: Contexto) => consultar(ctx, `
  (select 'ATRASO' as tipo, 'critico' as nivel,
          'OS ' || numero || ' vencida em ' || to_char(prazo_em,'DD/MM') as texto,
          id::text as alvo, 'ordem' as entidade
     from manutencao.vw_ordem_sla
    where tenant_id=$1 and atrasada order by prazo_em limit 6)
  union all
  (select 'ESTOQUE', 'alerta',
          'Estoque critico: ' || nome || ' (' || trim(to_char(quantidade,'FM999999D999')) || ' ' || unidade || ')',
          id::text, 'estoque'
     from manutencao.item_estoque
    where tenant_id=$1 and excluido_em is null
      and quantidade_minima is not null and quantidade <= quantidade_minima
    order by quantidade limit 5)
  union all
  (select 'CONTRATO', 'alerta',
          'Contrato ' || coalesce(numero_contrato,'s/n') || ' de ' || razao_social ||
          ' vence em ' || to_char(contrato_fim,'DD/MM/YYYY'),
          id::text, 'contratada'
     from manutencao.contratada
    where tenant_id=$1 and excluido_em is null and contrato_fim is not null
      and contrato_fim between current_date and current_date + 60
    order by contrato_fim limit 4)
  union all
  (select 'PLANO', 'info',
          'Plano "' || nome || '" programado para ' || to_char(proxima_execucao,'DD/MM'),
          id::text, 'plano'
     from manutencao.plano
    where tenant_id=$1 and excluido_em is null and ativo
      and proxima_execucao between current_date and current_date + 15
    order by proxima_execucao limit 5)
`, [ctx.tenantId]);

/* predio/atraso/mes existiam como link no painel mas nao como filtro aqui: a
   tela abria mostrando TODAS as ordens, o que e pior que um erro — o gestor le
   um numero achando que e o recorte em que clicou. */
export type FiltroOrdem = {
  situacao?: string; tipo?: string; prioridade?: string; busca?: string;
  predio?: string; atraso?: boolean; mes?: string;
};

export const listarOrdens = (ctx: Contexto, f: FiltroOrdem = {}, limite = 100) => consultar(ctx, `
  select o.id, o.numero, o.titulo, o.tipo, o.situacao, o.prioridade,
         o.aberta_em, o.prazo_em, o.concluida_em, o.custo_estimado, o.custo_real,
         p.nome as predio, s.nome as setor, a.nome as ativo,
         c.razao_social as contratada,
         v.atrasada, v.dentro_prazo
    from manutencao.ordem o
    join manutencao.predio p on p.id = o.predio_id
    left join manutencao.setor s on s.id = o.setor_id
    left join manutencao.ativo a on a.id = o.ativo_id
    left join manutencao.contratada c on c.id = o.contratada_id
    join manutencao.vw_ordem_sla v on v.id = o.id
   where o.tenant_id = $1 and o.excluido_em is null
     and ($2::text is null or o.situacao   = $2)
     and ($3::text is null or o.tipo       = $3)
     and ($4::text is null or o.prioridade = $4)
     and ($5::text is null or o.numero ilike '%'||$5||'%' or o.titulo ilike '%'||$5||'%')
     and ($6::uuid is null or o.predio_id  = $6::uuid)
     and ($7::boolean is not true or v.atrasada)
     and ($8::text is null
          or date_trunc('month', coalesce(o.concluida_em, o.aberta_em)) = ($8 || '-01')::date)
   order by o.aberta_em desc
   limit $9`,
  [ctx.tenantId, f.situacao || null, f.tipo || null, f.prioridade || null, f.busca || null,
   f.predio || null, f.atraso === true, f.mes || null, limite]);

export const obterOrdem = (ctx: Contexto, id: string) => consultarUm(ctx, `
  select o.*, p.nome as predio, s.nome as setor, s.centro_custo,
         a.nome as ativo, a.codigo as ativo_codigo, a.codigo_publico,
         c.razao_social as contratada, c.cnpj as contratada_cnpj,
         ur.nome as responsavel, uf.nome as fiscal,
         v.atrasada, v.dentro_prazo, v.horas_decorridas
    from manutencao.ordem o
    join manutencao.predio p on p.id = o.predio_id
    left join manutencao.setor s on s.id = o.setor_id
    left join manutencao.ativo a on a.id = o.ativo_id
    left join manutencao.contratada c on c.id = o.contratada_id
    left join manutencao.usuario ur on ur.id = o.responsavel_id
    left join manutencao.usuario uf on uf.id = o.fiscal_id
    join manutencao.vw_ordem_sla v on v.id = o.id
   where o.tenant_id=$1 and o.id=$2 and o.excluido_em is null`, [ctx.tenantId, id]);

export const checklistDaOrdem = (ctx: Contexto, id: string) => consultar(ctx, `
  select id, ordem_exibicao, descricao, tipo_resposta, resposta, conforme, observacao
    from manutencao.ordem_checklist
   where tenant_id=$1 and ordem_id=$2 and excluido_em is null
   order by ordem_exibicao`, [ctx.tenantId, id]);

export const comentarios = (ctx: Contexto, entidade: string, id: string) => consultar(ctx, `
  select id, autor_nome, texto, criado_em
    from manutencao.comentario
   where tenant_id=$1 and entidade=$2 and entidade_id=$3 and excluido_em is null
   order by criado_em`, [ctx.tenantId, entidade, id]);

export const anexos = (ctx: Contexto, entidade: string, id: string) => consultar(ctx, `
  select id, nome_arquivo, categoria, tipo_mime, tamanho_bytes, criado_em
    from manutencao.anexo
   where tenant_id=$1 and entidade=$2 and entidade_id=$3 and excluido_em is null
   order by criado_em desc`, [ctx.tenantId, entidade, id]);

export const listarSolicitacoes = (ctx: Contexto, situacao?: string) => consultar(ctx, `
  select s.id, s.numero, s.titulo, s.situacao, s.prioridade, s.origem,
         s.solicitante_nome, s.criado_em, s.ordem_id,
         p.nome as predio, st.nome as setor, a.nome as ativo, o.numero as ordem_numero
    from manutencao.solicitacao s
    join manutencao.predio p on p.id = s.predio_id
    left join manutencao.setor st on st.id = s.setor_id
    left join manutencao.ativo a on a.id = s.ativo_id
    left join manutencao.ordem o on o.id = s.ordem_id
   where s.tenant_id=$1 and s.excluido_em is null
     and ($2::text is null or s.situacao = $2)
   order by s.criado_em desc limit 150`, [ctx.tenantId, situacao || null]);

export const listarAtivos = (ctx: Contexto, busca?: string) => consultar(ctx, `
  select a.id, a.nome, a.codigo, a.tombamento, a.codigo_publico, a.categoria,
         a.situacao, a.criticidade, a.valor_aquisicao, a.garantia_ate,
         p.nome as predio, s.nome as setor,
         (select count(*) from manutencao.ordem o
           where o.ativo_id=a.id and o.excluido_em is null)::int as ordens
    from manutencao.ativo a
    join manutencao.predio p on p.id = a.predio_id
    left join manutencao.setor s on s.id = a.setor_id
   where a.tenant_id=$1 and a.excluido_em is null
     and ($2::text is null or a.nome ilike '%'||$2||'%' or a.codigo ilike '%'||$2||'%'
          or a.tombamento ilike '%'||$2||'%')
   order by p.nome, a.codigo limit 400`, [ctx.tenantId, busca || null]);

export const obterAtivo = (ctx: Contexto, id: string) => consultarUm(ctx, `
  select a.*, p.nome as predio, s.nome as setor, s.centro_custo
    from manutencao.ativo a
    join manutencao.predio p on p.id = a.predio_id
    left join manutencao.setor s on s.id = a.setor_id
   where a.tenant_id=$1 and a.id=$2 and a.excluido_em is null`, [ctx.tenantId, id]);

export const historicoDoAtivo = (ctx: Contexto, id: string) => consultar(ctx, `
  select o.id, o.numero, o.titulo, o.tipo, o.situacao, o.aberta_em, o.concluida_em, o.custo_real
    from manutencao.ordem o
   where o.tenant_id=$1 and o.ativo_id=$2 and o.excluido_em is null
   order by o.aberta_em desc limit 50`, [ctx.tenantId, id]);

export const listarPredios = (ctx: Contexto) => consultar(ctx, `
  select p.*, 
         (select count(*) from manutencao.setor s where s.predio_id=p.id and s.excluido_em is null)::int as setores,
         (select count(*) from manutencao.ativo a where a.predio_id=p.id and a.excluido_em is null)::int as ativos,
         (select coalesce(sum(o.custo_real),0) from manutencao.ordem o
           where o.predio_id=p.id and o.situacao='CONCLUIDA' and o.excluido_em is null) as custo
    from manutencao.predio p
   where p.tenant_id=$1 and p.excluido_em is null
   order by p.nome`, [ctx.tenantId]);

export const listarSetores = (ctx: Contexto) => consultar(ctx, `
  select s.*, p.nome as predio,
         (select count(*) from manutencao.ativo a where a.setor_id=s.id and a.excluido_em is null)::int as ativos
    from manutencao.setor s join manutencao.predio p on p.id=s.predio_id
   where s.tenant_id=$1 and s.excluido_em is null order by p.nome, s.nome`, [ctx.tenantId]);

export const listarContratadas = (ctx: Contexto) => consultar(ctx, `
  select c.*,
         (select count(*) from manutencao.ordem o where o.contratada_id=c.id and o.excluido_em is null)::int as ordens,
         (select coalesce(sum(o.custo_real),0) from manutencao.ordem o
           where o.contratada_id=c.id and o.situacao='CONCLUIDA' and o.excluido_em is null) as executado,
         (select round(100.0*count(*) filter (where v.dentro_prazo)/nullif(count(*) filter (where v.dentro_prazo is not null),0),1)
            from manutencao.vw_ordem_sla v where v.contratada_id=c.id and v.situacao='CONCLUIDA') as sla
    from manutencao.contratada c
   where c.tenant_id=$1 and c.excluido_em is null order by c.razao_social`, [ctx.tenantId]);

export const listarPlanos = (ctx: Contexto) => consultar(ctx, `
  select pl.*, p.nome as predio, c.razao_social as contratada, cm.nome as checklist, cm.norma
    from manutencao.plano pl
    join manutencao.predio p on p.id = pl.predio_id
    left join manutencao.contratada c on c.id = pl.contratada_id
    left join manutencao.checklist_modelo cm on cm.id = pl.checklist_id
   where pl.tenant_id=$1 and pl.excluido_em is null
   order by pl.proxima_execucao nulls last`, [ctx.tenantId]);

export const listarEstoque = (ctx: Contexto) => consultar(ctx, `
  select i.*, p.nome as predio,
         (i.quantidade_minima is not null and i.quantidade <= i.quantidade_minima) as critico,
         (i.quantidade * coalesce(i.custo_unitario,0))::numeric(14,2) as valor_total
    from manutencao.item_estoque i
    left join manutencao.predio p on p.id = i.predio_id
   where i.tenant_id=$1 and i.excluido_em is null order by critico desc, i.nome`, [ctx.tenantId]);

export const listarMedicoes = (ctx: Contexto) => consultar(ctx, `
  select m.*, c.razao_social as contratada, c.cnpj, c.numero_contrato,
         (select count(*) from manutencao.medicao_ordem mo where mo.medicao_id=m.id)::int as ordens
    from manutencao.medicao m
    join manutencao.contratada c on c.id = m.contratada_id
   where m.tenant_id=$1 and m.excluido_em is null
   order by m.competencia desc, c.razao_social`, [ctx.tenantId]);

export const obterMedicao = (ctx: Contexto, id: string) => consultarUm(ctx, `
  select m.*, c.razao_social as contratada, c.cnpj, c.numero_contrato, c.email,
         u.nome as atestada_por_nome
    from manutencao.medicao m
    join manutencao.contratada c on c.id = m.contratada_id
    left join manutencao.usuario u on u.id = m.atestada_por
   where m.tenant_id=$1 and m.id=$2 and m.excluido_em is null`, [ctx.tenantId, id]);

export const ordensDaMedicao = (ctx: Contexto, id: string) => consultar(ctx, `
  select mo.valor, mo.glosa, mo.motivo_glosa,
         o.id, o.numero, o.titulo, o.tipo, o.concluida_em, o.nota_qualidade,
         p.nome as predio, v.dentro_prazo
    from manutencao.medicao_ordem mo
    join manutencao.ordem o on o.id = mo.ordem_id
    join manutencao.predio p on p.id = o.predio_id
    join manutencao.vw_ordem_sla v on v.id = o.id
   where mo.tenant_id=$1 and mo.medicao_id=$2
   order by o.concluida_em`, [ctx.tenantId, id]);

export const listarUsuarios = (ctx: Contexto) => consultar(ctx, `
  select u.id, u.nome, u.email, u.papel, u.departamento, u.telefone, u.ativo,
         u.criado_em, cr.ultimo_acesso_em
    from manutencao.usuario u
    left join manutencao.credencial cr on cr.usuario_id = u.id
   where u.tenant_id=$1 and u.excluido_em is null order by u.nome`, [ctx.tenantId]);

export const trilhaAuditoria = (ctx: Contexto, entidade?: string, limite = 120) => consultar(ctx, `
  select l.id, l.acao, l.entidade, l.entidade_id, l.ocorrido_em, l.ip,
         u.nome as ator, l.antes, l.depois
    from manutencao.audit_log l
    left join manutencao.usuario u on u.id = l.ator_id
   where l.tenant_id=$1 and ($2::text is null or l.entidade = $2)
   order by l.ocorrido_em desc, l.id desc limit $3`,
  [ctx.tenantId, entidade || null, limite]);

export const logDeAcesso = (ctx: Contexto) => consultar(ctx, `
  select id, email, sucesso, motivo, ip, ocorrido_em
    from manutencao.log_acesso
   where tenant_id=$1 order by ocorrido_em desc limit 60`, [ctx.tenantId]);
