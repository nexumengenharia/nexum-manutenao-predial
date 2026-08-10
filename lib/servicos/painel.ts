import { consultar, consultarUm, type Contexto } from "@/lib/db";

/* ------------------------------------------------------------------
   Indicadores do painel executivo.
   Pergunta que guiou a escolha: "o que um gestor de manutencao precisa
   saber as 8h da manha para decidir o dia?" — nao "quais numeros da
   para calcular". Por isso todo indicador aqui ou exige uma acao ou
   muda uma decisao; numero que so enfeita ficou de fora.
------------------------------------------------------------------- */

export async function resumoExecutivo(ctx: Contexto) {
  return consultarUm(ctx, `
    with base as (
      select * from manutencao.ordem where excluido_em is null
    ), janela as (
      select
        count(*) filter (where situacao not in ('CONCLUIDA','CANCELADA'))            as abertas,
        count(*) filter (where situacao not in ('CONCLUIDA','CANCELADA')
                           and prazo_em < now())                                     as atrasadas,
        count(*) filter (where situacao not in ('CONCLUIDA','CANCELADA')
                           and prioridade in ('ALTA','URGENTE'))                     as criticas,
        count(*) filter (where aberta_em >= date_trunc('month', now()))              as abertas_mes,
        count(*) filter (where concluida_em >= date_trunc('month', now()))           as concluidas_mes,
        count(*) filter (where concluida_em >= now() - interval '7 days')            as concluidas_semana,
        count(*) filter (where aberta_em >= now() - interval '7 days')               as abertas_semana,
        coalesce(sum(custo_real) filter (where concluida_em >= date_trunc('month', now())), 0) as custo_mes,
        coalesce(sum(custo_real) filter (where concluida_em >= date_trunc('year', now())), 0)  as custo_ano,
        coalesce(sum(custo_estimado) filter (where situacao not in ('CONCLUIDA','CANCELADA')), 0) as custo_comprometido,
        avg(custo_real) filter (where situacao = 'CONCLUIDA')                        as custo_medio,
        avg(extract(epoch from (concluida_em - aberta_em))/3600.0)
          filter (where situacao = 'CONCLUIDA')                                      as horas_medias,
        avg(nota_qualidade) filter (where nota_qualidade is not null)                as nota_media,
        count(*) filter (where situacao = 'CONCLUIDA')                               as concluidas_total,
        count(*) filter (where situacao = 'CONCLUIDA' and concluida_em <= prazo_em)  as no_prazo
      from base
    )
    select j.*,
      case when j.concluidas_total > 0
           then round(j.no_prazo::numeric * 100 / j.concluidas_total, 1) else null end as sla,
      (select count(*) from manutencao.solicitacao
        where excluido_em is null and situacao in ('ABERTA','TRIAGEM'))               as solicitacoes_fila,
      (select count(*) from manutencao.solicitacao
        where excluido_em is null and situacao in ('ABERTA','TRIAGEM','EM_EXECUCAO')
          and prazo_em < now())                                                      as solicitacoes_vencidas,
      (select count(*) from manutencao.controle
        where excluido_em is null and situacao = 'VENCIDO')                          as controles_vencidos,
      (select count(*) from manutencao.controle
        where excluido_em is null and situacao = 'A_VENCER')                         as controles_a_vencer,
      (select count(*) from manutencao.item_estoque
        where excluido_em is null and quantidade <= quantidade_minima)               as estoque_critico,
      (select count(*) from manutencao.contratada
        where excluido_em is null and contrato_fim between current_date and current_date + 90) as contratos_vencendo,
      (select count(*) from manutencao.ativo
        where excluido_em is null and situacao = 'PARADO')                           as ativos_parados,
      (select count(*) from manutencao.veiculo where excluido_em is null)            as veiculos,
      (select count(*) from manutencao.veiculo
        where excluido_em is null and situacao = 'EM_MANUTENCAO')                    as veiculos_manutencao,
      (select count(*) from manutencao.veiculo_evento
        where excluido_em is null and tratado = false
          and ocorrido_em >= now() - interval '7 days')                              as eventos_frota
    from janela j`);
}

/** Comparativo com o mesmo periodo do mes anterior — sem isso o numero
    do mes nao diz se melhorou ou piorou. */
export async function tendencia(ctx: Contexto) {
  return consultarUm(ctx, `
    select
      count(*) filter (where concluida_em >= date_trunc('month', now()))                    as mes_atual,
      count(*) filter (where concluida_em >= date_trunc('month', now() - interval '1 month')
                         and concluida_em <  date_trunc('month', now())
                         and concluida_em <  date_trunc('month', now() - interval '1 month')
                                             + (now() - date_trunc('month', now())))        as mes_anterior_parcial,
      coalesce(sum(custo_real) filter (where concluida_em >= date_trunc('month', now())), 0) as custo_atual,
      coalesce(sum(custo_real) filter (where concluida_em >= date_trunc('month', now() - interval '1 month')
                         and concluida_em <  date_trunc('month', now())
                         and concluida_em <  date_trunc('month', now() - interval '1 month')
                                             + (now() - date_trunc('month', now()))), 0)    as custo_anterior
    from manutencao.ordem where excluido_em is null`);
}

export const porSituacao = (ctx: Contexto) => consultar(ctx, `
  select situacao, count(*)::int as total
    from manutencao.ordem where excluido_em is null
   group by situacao order by total desc`);

export const porTipo = (ctx: Contexto) => consultar(ctx, `
  select tipo, count(*)::int as total,
         coalesce(sum(custo_real) filter (where situacao='CONCLUIDA'),0) as custo,
         avg(custo_real) filter (where situacao='CONCLUIDA') as custo_medio,
         avg(extract(epoch from (concluida_em - aberta_em))/3600.0)
           filter (where situacao='CONCLUIDA') as horas_medias
    from manutencao.ordem where excluido_em is null
   group by tipo order by total desc`);

export const porPrioridade = (ctx: Contexto) => consultar(ctx, `
  select prioridade, count(*)::int as total
    from manutencao.ordem
   where excluido_em is null and situacao not in ('CONCLUIDA','CANCELADA')
   group by prioridade`);

export const custoPorMes = (ctx: Contexto) => consultar(ctx, `
  select to_char(date_trunc('month', concluida_em), 'YYYY-MM') as mes,
         sum(custo_real) as custo, count(*)::int as ordens
    from manutencao.ordem
   where excluido_em is null and situacao = 'CONCLUIDA'
     and concluida_em >= date_trunc('month', now()) - interval '11 months'
   group by 1 order by 1`);

export const indicadorPredio = (ctx: Contexto) => consultar(ctx, `
  select * from manutencao.vw_indicador_predio order by custo_total desc`);

export const indicadorTipo = (ctx: Contexto) => consultar(ctx, `
  select * from manutencao.vw_indicador_tipo order by custo_total desc nulls last`);

/** Ranking das mais antigas — o gestor pediu destaque para o que
    envelhece na fila, que e onde o SLA morre sem ninguem ver. */
export const maisAntigas = (ctx: Contexto, n = 8) => consultar(ctx, `
  select id, numero, titulo, tipo, prioridade, situacao, predio, setor, ativo,
         round(dias_aberta::numeric, 1) as dias_aberta, vencida,
         round(coalesce(dias_vencida,0)::numeric, 1) as dias_vencida, custo_estimado
    from manutencao.vw_carteira
   order by dias_aberta desc limit $1`, [n]);

export const maisCaras = (ctx: Contexto, n = 8) => consultar(ctx, `
  select o.id, o.numero, o.titulo, o.tipo, o.situacao, o.prioridade,
         coalesce(o.custo_real, o.custo_estimado) as custo,
         (o.custo_real is null) as estimado,
         p.nome as predio, a.nome as ativo, c.razao_social as contratada
    from manutencao.ordem o
    left join manutencao.predio p on p.id = o.predio_id
    left join manutencao.ativo a on a.id = o.ativo_id
    left join manutencao.contratada c on c.id = o.contratada_id
   where o.excluido_em is null
   order by coalesce(o.custo_real, o.custo_estimado) desc nulls last limit $1`, [n]);

/** Ativos que mais consomem: onde vale substituir em vez de consertar. */
export const ativosCriticos = (ctx: Contexto, n = 6) => consultar(ctx, `
  select a.id, a.nome, a.codigo, a.categoria, a.criticidade, a.situacao,
         p.nome as predio, i.ordens, i.corretivas, i.custo_total, i.custo_medio,
         a.valor_aquisicao,
         case when a.valor_aquisicao > 0
              then round(i.custo_total * 100 / a.valor_aquisicao, 1) end as pct_do_valor
    from manutencao.vw_indicador_ativo i
    join manutencao.ativo a on a.id = i.ativo_id
    left join manutencao.predio p on p.id = a.predio_id
   where a.excluido_em is null and i.custo_total > 0
   order by i.custo_total desc limit $1`, [n]);

export const vencimentosProximos = (ctx: Contexto, n = 10) => consultar(ctx, `
  select c.id, c.nome, c.tipo, c.norma, c.proxima_data, c.situacao, c.custo_previsto,
         (c.proxima_data - current_date) as dias,
         coalesce(a.nome, v.placa, ct.razao_social, p.nome) as alvo,
         case when a.id is not null then 'ativo'
              when v.id is not null then 'veiculo'
              when ct.id is not null then 'contratada' else 'predio' end as alvo_tipo
    from manutencao.controle c
    left join manutencao.ativo a on a.id = c.ativo_id
    left join manutencao.veiculo v on v.id = c.veiculo_id
    left join manutencao.contratada ct on ct.id = c.contratada_id
    left join manutencao.predio p on p.id = c.predio_id
   where c.excluido_em is null and c.situacao in ('VENCIDO','A_VENCER')
   order by c.proxima_data asc limit $1`, [n]);

export const quadroAtividades = (ctx: Contexto) => consultar(ctx, `
  select s.id, s.numero, s.titulo, s.situacao, s.prioridade, s.natureza,
         s.solicitante_nome, s.criado_em, s.prazo_em, s.origem,
         (s.prazo_em < now() and s.situacao not in ('CONCLUIDA','CANCELADA','CONVERTIDA')) as vencida,
         p.nome as predio, pt.nome as ponto, pt.tipo as ponto_tipo, e.nome as equipe
    from manutencao.solicitacao s
    left join manutencao.predio p on p.id = s.predio_id
    left join manutencao.ponto pt on pt.id = s.ponto_id
    left join manutencao.equipe e on e.id = s.equipe_id
   where s.excluido_em is null and s.situacao in ('ABERTA','TRIAGEM','EM_EXECUCAO')
   order by (s.prazo_em < now()) desc,
            array_position(array['URGENTE','ALTA','MEDIA','BAIXA'], s.prioridade),
            s.criado_em asc`);

export const cargaPorEquipe = (ctx: Contexto) => consultar(ctx, `
  select e.id, e.nome, e.natureza, e.sla_horas,
         count(s.id) filter (where s.situacao in ('ABERTA','TRIAGEM','EM_EXECUCAO'))     as fila,
         count(s.id) filter (where s.situacao in ('ABERTA','TRIAGEM','EM_EXECUCAO')
                               and s.prazo_em < now())                                   as vencidas,
         count(s.id) filter (where s.atendida_em >= now() - interval '30 days')           as atendidas_mes,
         avg(extract(epoch from (s.atendida_em - s.criado_em))/3600.0)
           filter (where s.atendida_em is not null)                                       as horas_medias,
         avg(s.avaliacao_solicitante) filter (where s.avaliacao_solicitante is not null)  as nota
    from manutencao.equipe e
    left join manutencao.solicitacao s on s.equipe_id = e.id and s.excluido_em is null
   where e.excluido_em is null and e.ativo
   group by e.id, e.nome, e.natureza, e.sla_horas
   order by fila desc`);
