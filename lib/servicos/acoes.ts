import { comContexto, semContexto, type Contexto } from "../db";

/* ---------------------------------------------------------------------------
   Escritas. Toda escrita passa por comContexto(), portanto:
   - roda em transacao unica
   - carrega app.tenant_id / app.usuario_id / app.ip  (R10)
   - dispara o gatilho de auditoria automaticamente
   Nenhuma exclusao fisica: o papel da aplicacao nao tem DELETE (R4).
--------------------------------------------------------------------------- */

async function proximoNumero(c: any, tenantId: string, tabela: "ordem" | "solicitacao", prefixo: string) {
  const { rows } = await c.query(
    `select coalesce(max(nullif(regexp_replace(numero, '^.*-', ''), '')::int), 0) + 1 as n
       from manutencao.${tabela}
      where tenant_id = $1 and numero like $2`,
    [tenantId, `${prefixo}-${new Date().getFullYear()}-%`],
  );
  return `${prefixo}-${new Date().getFullYear()}-${String(rows[0].n).padStart(4, "0")}`;
}

export type Execucao = "INTERNA_MANUTENCAO" | "INTERNA_ZELADORIA" | "EXTERNA";

export type NovaOrdem = {
  predioId: string; setorId?: string | null; ativoId?: string | null;
  contratadaId?: string | null; planoId?: string | null; solicitacaoId?: string | null;
  titulo: string; descricao?: string | null; tipo: string; prioridade: string;
  prazoHoras?: number | null; custoEstimado?: number | null;
  execucao?: Execucao | null;
};

export async function criarOrdem(ctx: Contexto, d: NovaOrdem) {
  return comContexto(ctx, async (c) => {
    const numero = await proximoNumero(c, ctx.tenantId, "ordem", "OS");
    // Nota: coluna 'execucao' e opcional no INSERT — se a migration
    // 2026-08-16-execucao-ordem.sql ainda nao rodou, a coluna nao existe
    // e o INSERT falharia. Aqui garantimos que ela e enviada como null se
    // ausente e como texto se veio da triagem.
    const { rows } = await c.query(
      `insert into manutencao.ordem
         (tenant_id, predio_id, setor_id, ativo_id, contratada_id, plano_id, solicitacao_id,
          responsavel_id, numero, titulo, descricao, tipo, prioridade, prazo_em, custo_estimado, execucao)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
               case when $14::int is null then null else now() + ($14 || ' hours')::interval end,
               $15,$16)
       returning id, numero`,
      [ctx.tenantId, d.predioId, d.setorId || null, d.ativoId || null, d.contratadaId || null,
       d.planoId || null, d.solicitacaoId || null, ctx.usuarioId || null, numero, d.titulo,
       d.descricao || null, d.tipo, d.prioridade, d.prazoHoras ?? null, d.custoEstimado ?? null,
       d.execucao ?? null],
    );

    // Ordem nascida de plano com checklist recebe os itens do modelo.
    if (d.planoId) {
      await c.query(
        `insert into manutencao.ordem_checklist
           (tenant_id, ordem_id, item_modelo_id, ordem_exibicao, descricao, tipo_resposta)
         select $1, $2, i.id, i.ordem, i.descricao, i.tipo_resposta
           from manutencao.plano pl
           join manutencao.checklist_modelo_item i on i.modelo_id = pl.checklist_id
          where pl.id = $3 and pl.tenant_id = $1 and i.excluido_em is null
          order by i.ordem`,
        [ctx.tenantId, rows[0].id, d.planoId],
      );
    }
    if (d.solicitacaoId) {
      await c.query(
        `update manutencao.solicitacao set situacao='CONVERTIDA', ordem_id=$3
          where tenant_id=$1 and id=$2`,
        [ctx.tenantId, d.solicitacaoId, rows[0].id],
      );
    }
    return rows[0] as { id: string; numero: string };
  });
}

export async function mudarSituacaoOrdem(
  ctx: Contexto, id: string, situacao: string,
  extra: { custoReal?: number | null; horas?: number | null; nota?: number | null; parecer?: string | null } = {},
) {
  return comContexto(ctx, async (c) => {
    const { rows } = await c.query(
      `update manutencao.ordem set
          situacao      = $3,
          iniciada_em   = case when $3 = 'EM_EXECUCAO' and iniciada_em is null then now() else iniciada_em end,
          concluida_em  = case when $3 = 'CONCLUIDA' then coalesce(concluida_em, now())
                               when $3 in ('ABERTA','EM_EXECUCAO','AGUARDANDO_PECA') then null
                               else concluida_em end,
          custo_real       = coalesce($4, custo_real),
          horas_trabalhadas= coalesce($5, horas_trabalhadas),
          nota_qualidade   = coalesce($6, nota_qualidade),
          parecer_fiscal   = coalesce($7, parecer_fiscal)
        where tenant_id=$1 and id=$2 and excluido_em is null
        returning id, numero, situacao`,
      [ctx.tenantId, id, situacao, extra.custoReal ?? null, extra.horas ?? null,
       extra.nota ?? null, extra.parecer ?? null],
    );
    if (!rows[0]) throw new Error("Ordem nao encontrada.");
    return rows[0];
  });
}

/* Redireciona uma OS ja triada para outra classificacao (ex.: era interna,
   virou externa; ou vice-versa). Usado na aba Execucao de servicos quando o
   gestor precisa corrigir o roteamento. */
export async function definirExecucaoOrdem(
  ctx: Contexto, id: string, execucao: Execucao, contratadaId?: string | null,
) {
  return comContexto(ctx, async (c) => {
    const { rows } = await c.query(
      `update manutencao.ordem
          set execucao = $3,
              contratada_id = case when $3 = 'EXTERNA' then $4::uuid else null end
        where tenant_id=$1 and id=$2 and excluido_em is null
        returning id, execucao, contratada_id`,
      [ctx.tenantId, id, execucao, contratadaId || null],
    );
    if (!rows[0]) throw new Error("Ordem nao encontrada.");
    return rows[0];
  });
}

export async function responderChecklist(
  ctx: Contexto, itemId: string, v: { resposta?: string | null; conforme?: boolean | null; observacao?: string | null },
) {
  return comContexto(ctx, async (c) => {
    await c.query(
      `update manutencao.ordem_checklist
          set resposta=$3, conforme=$4, observacao=$5
        where tenant_id=$1 and id=$2`,
      [ctx.tenantId, itemId, v.resposta ?? null, v.conforme ?? null, v.observacao ?? null],
    );
  });
}

export async function excluirLogicamente(ctx: Contexto, tabela: string, id: string) {
  const permitidas = ["ordem", "solicitacao", "ativo", "predio", "setor", "contratada", "plano", "item_estoque"];
  if (!permitidas.includes(tabela)) throw new Error("Entidade nao permitida.");
  return comContexto(ctx, async (c) => {
    await c.query(
      `update manutencao.${tabela} set excluido_em = now()
        where tenant_id=$1 and id=$2 and excluido_em is null`,
      [ctx.tenantId, id],
    );
  });
}

export async function comentar(ctx: Contexto, entidade: string, entidadeId: string, autorNome: string, texto: string) {
  return comContexto(ctx, async (c) => {
    const { rows } = await c.query(
      `insert into manutencao.comentario (tenant_id, entidade, entidade_id, autor_id, autor_nome, texto)
       values ($1,$2,$3,$4,$5,$6) returning id, criado_em`,
      [ctx.tenantId, entidade, entidadeId, ctx.usuarioId || null, autorNome, texto],
    );
    return rows[0];
  });
}

/* Abertura interna de solicitacao (gestor/fiscal registrando um chamado
   relatado por telefone, presencialmente etc — sem passar pelo QR). */
export type NovaSolicitacao = {
  predioId: string; setorId?: string | null; pontoId?: string | null; ativoId?: string | null;
  equipeId?: string | null; natureza: string; titulo: string; descricao?: string | null;
  prioridade?: string; solicitanteNome: string; solicitanteContato?: string | null;
};

export async function criarSolicitacaoInterna(ctx: Contexto, d: NovaSolicitacao) {
  return comContexto(ctx, async (c) => {
    const numero = await proximoNumero(c, ctx.tenantId, "solicitacao", "SOL");
    let equipeId = d.equipeId || null;
    if (!equipeId) {
      const { rows: eq } = await c.query(
        `select id from manutencao.equipe where tenant_id=$1 and natureza=$2 and ativo limit 1`,
        [ctx.tenantId, d.natureza]);
      equipeId = eq[0]?.id ?? null;
    }
    const { rows } = await c.query(
      `insert into manutencao.solicitacao
         (tenant_id, predio_id, setor_id, ponto_id, ativo_id, equipe_id, natureza, numero,
          titulo, descricao, prioridade, solicitante_nome, solicitante_contato, origem)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'MANUAL')
       returning id, numero`,
      [ctx.tenantId, d.predioId, d.setorId || null, d.pontoId || null, d.ativoId || null,
       equipeId, d.natureza, numero, d.titulo, d.descricao || null, d.prioridade || "MEDIA",
       d.solicitanteNome, d.solicitanteContato || null]);
    return rows[0] as { id: string; numero: string };
  });
}

export async function triarSolicitacao(ctx: Contexto, id: string, situacao: string) {
  return comContexto(ctx, async (c) => {
    await c.query(
      `update manutencao.solicitacao set situacao=$3 where tenant_id=$1 and id=$2`,
      [ctx.tenantId, id, situacao],
    );
  });
}

/* Ficha da solicitacao (triagem): grava a prioridade definida pelo triador e
   garante que o card saia de ABERTA para TRIAGEM no mesmo gesto. */
export async function definirPrioridadeSolicitacao(ctx: Contexto, id: string, prioridade: string) {
  return comContexto(ctx, async (c) => {
    const { rows } = await c.query(
      `update manutencao.solicitacao
          set prioridade = $3,
              situacao = case when situacao = 'ABERTA' then 'TRIAGEM' else situacao end
        where tenant_id=$1 and id=$2 and excluido_em is null
        returning id, situacao, prioridade`,
      [ctx.tenantId, id, prioridade]);
    if (!rows[0]) throw new Error("Solicitacao nao encontrada.");
    return rows[0];
  });
}

/* Criacao de controle de vencimento. Fora do padrao generico CADASTROS porque
   a tabela tem uma CHECK (controle_alvo_unico) exigindo exatamente uma das
   colunas ativo_id/ponto_id/predio_id/contratada_id/veiculo_id preenchida —
   o formulario escolhe o alvo por tipo e so a coluna correspondente recebe
   valor, as outras quatro vao null. */
export type NovoControle = {
  alvoTipo: "ativo" | "ponto" | "predio" | "contratada" | "veiculo";
  alvoId: string;
  nome: string; tipo: string; norma?: string | null;
  periodicidadeMeses?: number | null; ultimaData?: string | null; proximaData: string;
  custoPrevisto?: number | null; geraOrdem?: boolean;
};

export async function criarControle(ctx: Contexto, d: NovoControle) {
  const colunas: Record<NovoControle["alvoTipo"], string> = {
    ativo: "ativo_id", ponto: "ponto_id", predio: "predio_id",
    contratada: "contratada_id", veiculo: "veiculo_id",
  };
  const coluna = colunas[d.alvoTipo];
  if (!coluna) throw new Error("Alvo do controle invalido.");

  return comContexto(ctx, async (c) => {
    const { rows } = await c.query(
      `insert into manutencao.controle
         (tenant_id, ${coluna}, nome, tipo, norma, periodicidade_meses, ultima_data,
          proxima_data, situacao, custo_previsto, gera_ordem, criado_por)
       values ($1,$2,$3,$4,$5,$6,$7,$8,
               case when $8::date < current_date then 'VENCIDO'
                    when $8::date <= current_date + 30 then 'A_VENCER'
                    else 'VIGENTE' end,
               $9,$10,$11)
       returning id`,
      [ctx.tenantId, d.alvoId, d.nome, d.tipo, d.norma || null,
       d.periodicidadeMeses ?? null, d.ultimaData || null, d.proximaData,
       d.custoPrevisto ?? null, d.geraOrdem ?? false, ctx.usuarioId || null]);
    return rows[0] as { id: string };
  });
}

/* Registra um abastecimento do veiculo — usa a tabela manutencao.abastecimento
   que ja existe. Ate hoje ela era so preenchida por migration de demonstracao;
   agora tem tela para o gestor lancar direto, com data, litros, valor total
   e o numero/link da nota fiscal. */
export type NovoAbastecimento = {
  veiculoId: string; data?: string; hodometro?: number | null;
  litros: number; valor: number; combustivel?: string | null;
  posto?: string | null; motoristaId?: string | null; motoristaNome?: string | null;
  notaFiscal?: string | null; observacoes?: string | null;
};

export async function registrarAbastecimento(ctx: Contexto, d: NovoAbastecimento) {
  return comContexto(ctx, async (c) => {
    // Base minima que a tabela ja tinha na migration original de frota.
    // Nao mexo em colunas extras (nota_fiscal, posto, motorista) porque
    // dependem de coluna que talvez nao exista neste tenant; guardo o extra
    // no campo observacoes se a tabela nao acomodar.
    const obs = [
      d.observacoes || null,
      d.posto ? `posto: ${d.posto}` : null,
      d.motoristaNome ? `motorista: ${d.motoristaNome}` : null,
      d.notaFiscal ? `NF: ${d.notaFiscal}` : null,
      d.combustivel ? `combustivel: ${d.combustivel}` : null,
    ].filter(Boolean).join(" · ");

    const { rows } = await c.query(
      `insert into manutencao.abastecimento
         (tenant_id, veiculo_id, ocorrido_em, hodometro, litros, valor_total, observacoes)
       values ($1,$2, coalesce($3::timestamptz, now()), $4, $5, $6, $7)
       returning id`,
      [ctx.tenantId, d.veiculoId, d.data || null, d.hodometro ?? null,
       d.litros, d.valor, obs || null],
    );

    // Atualiza o hodometro do veiculo se o novo for maior que o registrado.
    if (d.hodometro != null) {
      await c.query(
        `update manutencao.veiculo set hodometro = greatest(coalesce(hodometro, 0), $3)
          where tenant_id=$1 and id=$2`,
        [ctx.tenantId, d.veiculoId, d.hodometro]);
    }
    return rows[0] as { id: string };
  });
}

export async function movimentarEstoque(
  ctx: Contexto, itemId: string, tipo: "ENTRADA" | "SAIDA" | "AJUSTE", quantidade: number, motivo?: string,
) {
  return comContexto(ctx, async (c) => {
    const { rows } = await c.query(
      `select quantidade, custo_unitario from manutencao.item_estoque
        where tenant_id=$1 and id=$2 for update`, [ctx.tenantId, itemId]);
    if (!rows[0]) throw new Error("Item inexistente.");

    const atual = Number(rows[0].quantidade);
    const nova = tipo === "ENTRADA" ? atual + quantidade
               : tipo === "SAIDA"   ? atual - quantidade
               : quantidade;
    if (nova < 0) throw new Error("Saida maior que o saldo disponivel.");

    await c.query(
      `insert into manutencao.movimento_estoque (tenant_id, item_id, tipo, quantidade, custo_unitario, motivo)
       values ($1,$2,$3,$4,$5,$6)`,
      [ctx.tenantId, itemId, tipo, quantidade, rows[0].custo_unitario, motivo || null]);

    await c.query(`update manutencao.item_estoque set quantidade=$3 where tenant_id=$1 and id=$2`,
      [ctx.tenantId, itemId, nova]);
    return { saldo: nova };
  });
}

export async function gerarMedicao(ctx: Contexto, contratadaId: string, competencia: string) {
  return comContexto(ctx, async (c) => {
    const inicio = `${competencia}-01`;
    const { rows: existe } = await c.query(
      `select id from manutencao.medicao
        where tenant_id=$1 and contratada_id=$2 and competencia=$3::date and excluido_em is null`,
      [ctx.tenantId, contratadaId, inicio]);
    if (existe[0]) throw new Error("Ja existe medicao para esta contratada nesta competencia.");

    const { rows: ordens } = await c.query(
      `select id, custo_real from manutencao.ordem
        where tenant_id=$1 and contratada_id=$2 and situacao='CONCLUIDA' and excluido_em is null
          and date_trunc('month', concluida_em) = $3::date
          and id not in (select ordem_id from manutencao.medicao_ordem where tenant_id=$1)`,
      [ctx.tenantId, contratadaId, inicio]);
    if (!ordens.length) throw new Error("Nenhuma ordem concluida nao medida nesta competencia.");

    const bruto = ordens.reduce((s: number, o: any) => s + Number(o.custo_real ?? 0), 0);
    const numero = `MED-${competencia.replace("-", "")}-${contratadaId.slice(0, 4)}`;

    const { rows: m } = await c.query(
      `insert into manutencao.medicao
         (tenant_id, contratada_id, numero, competencia, periodo_inicio, periodo_fim,
          situacao, valor_bruto, valor_glosa, valor_liquido)
       values ($1,$2,$3,$4::date,$4::date,($4::date + interval '1 month - 1 day')::date,
               'ABERTA',$5,0,$5)
       returning id, numero`,
      [ctx.tenantId, contratadaId, numero, inicio, bruto.toFixed(2)]);

    for (const o of ordens) {
      await c.query(
        `insert into manutencao.medicao_ordem (tenant_id, medicao_id, ordem_id, valor)
         values ($1,$2,$3,$4)`,
        [ctx.tenantId, m[0].id, o.id, o.custo_real]);
    }
    return m[0];
  });
}

export async function atestarMedicao(ctx: Contexto, id: string, glosa: number, observacoes?: string) {
  return comContexto(ctx, async (c) => {
    const { rows } = await c.query(
      `update manutencao.medicao
          set situacao='ATESTADA', valor_glosa=$3,
              valor_liquido = valor_bruto - $3,
              atestada_por=$4, atestada_em=now(), observacoes=coalesce($5, observacoes)
        where tenant_id=$1 and id=$2 and situacao in ('ABERTA','FECHADA') and excluido_em is null
        returning id, numero, valor_liquido`,
      [ctx.tenantId, id, glosa.toFixed(2), ctx.usuarioId || null, observacoes || null]);
    if (!rows[0]) throw new Error("Medicao nao encontrada ou ja atestada.");
    return rows[0];
  });
}

/* -------------------------------------------------------------------------
   Abertura publica de chamado por QR Code. Nao ha sessao: o token do ativo
   e a unica credencial, e ele so permite CRIAR solicitacao naquele ativo.
------------------------------------------------------------------------- */
export async function ativoPorTokenPublico(codigo: string) {
  return semContexto(async (c) => {
    const { rows } = await c.query(
      `select a.id, a.tenant_id, a.nome, a.codigo, a.tombamento, a.categoria, a.situacao,
              a.fabricante, a.modelo, a.pavimento, a.localizacao, a.predio_id, a.setor_id,
              p.nome as predio, s.nome as setor, t.sigla as tribunal, t.nome as tribunal_nome
         from manutencao.ativo a
         join manutencao.predio p on p.id = a.predio_id
         left join manutencao.setor s on s.id = a.setor_id
         join manutencao.tribunal t on t.id = a.tenant_id
        where a.codigo_publico = $1 and a.excluido_em is null`,
      [codigo.toUpperCase()]);
    return rows[0] ?? null;
  });
}

export async function abrirChamadoPublico(
  codigo: string,
  d: { titulo: string; descricao?: string; solicitante: string; contato?: string; prioridade?: string },
) {
  const ativo = await ativoPorTokenPublico(codigo);
  if (!ativo) throw new Error("Ativo nao localizado.");

  const ctx: Contexto = { tenantId: ativo.tenant_id, usuarioId: null, ip: null };
  return comContexto(ctx, async (c) => {
    const numero = await proximoNumero(c, ativo.tenant_id, "solicitacao", "SOL");
    const { rows } = await c.query(
      `insert into manutencao.solicitacao
         (tenant_id, predio_id, setor_id, ativo_id, numero, titulo, descricao,
          prioridade, solicitante_nome, solicitante_contato, origem, localizacao)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'QRCODE',$11)
       returning id, numero`,
      [ativo.tenant_id, ativo.predio_id, ativo.setor_id, ativo.id, numero,
       d.titulo, d.descricao || null, d.prioridade || "MEDIA",
       d.solicitante, d.contato || null, ativo.localizacao]);
    return rows[0] as { id: string; numero: string };
  });
}

/* -------------------------------------------------------------------------
   Abertura publica de chamado por QR de PONTO de servico (corredor, banheiro,
   copa etc). Diferente do chamado por ativo, aqui quem relata escolhe a
   natureza (limpeza/manutencao/seguranca) na propria tela, e o chamado e
   roteado automaticamente para a equipe daquela natureza no tenant do ponto.
------------------------------------------------------------------------- */
export async function pontoPorTokenPublico(codigo: string) {
  return semContexto(async (c) => {
    const { rows } = await c.query(
      `select pt.id, pt.tenant_id, pt.nome, pt.tipo, pt.pavimento, pt.localizacao,
              pt.codigo, pt.predio_id, pt.setor_id,
              pr.nome as predio, s.nome as setor, t.sigla, t.nome as tribunal_nome
         from manutencao.ponto pt
         join manutencao.tribunal t on t.id = pt.tenant_id
         left join manutencao.predio pr on pr.id = pt.predio_id
         left join manutencao.setor s on s.id = pt.setor_id
        where pt.codigo_publico = $1 and pt.excluido_em is null and pt.ativo`,
      [codigo.toUpperCase()]);
    return rows[0] ?? null;
  });
}

export async function abrirChamadoPontoPublico(
  codigo: string,
  d: { natureza: string; titulo: string; descricao?: string; solicitante?: string; contato?: string; prioridade?: string },
) {
  const ponto = await pontoPorTokenPublico(codigo);
  if (!ponto) throw new Error("Ponto nao localizado.");

  const ctx: Contexto = { tenantId: ponto.tenant_id, usuarioId: null, ip: null };
  return comContexto(ctx, async (c) => {
    const numero = await proximoNumero(c, ponto.tenant_id, "solicitacao", "SOL");
    const { rows: eq } = await c.query(
      `select e.id, e.nome from manutencao.equipe e
        where e.tenant_id=$1 and e.natureza=$2 and e.ativo limit 1`,
      [ponto.tenant_id, d.natureza]);
    const equipeId = eq[0]?.id ?? null;
    const { rows } = await c.query(
      `insert into manutencao.solicitacao
         (tenant_id, predio_id, setor_id, ponto_id, equipe_id, natureza, numero, titulo,
          descricao, prioridade, solicitante_nome, solicitante_contato, origem, localizacao)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'QRCODE',$13)
       returning id, numero`,
      [ponto.tenant_id, ponto.predio_id, ponto.setor_id, ponto.id, equipeId, d.natureza, numero,
       d.titulo, d.descricao || null, d.prioridade || "MEDIA",
       d.solicitante || "Usuário do prédio", d.contato || null, ponto.localizacao]);
    return { id: rows[0].id, numero: rows[0].numero, equipe: eq[0]?.nome ?? "Equipe responsável" };
  });
}

/* ===========================================================================
   CADASTROS BASE (predio, ativo, contratada, controle, veiculo, equipe...)

   Sem estes cadastros o sistema so consegue LER a massa de demonstracao: nao
   ha como o orgao registrar o proprio patrimonio. Os indicadores do painel
   (custo por predio, ativo que mais consome, vencimentos, carga por equipe)
   dependem inteiramente destas tabelas estarem preenchidas com dado real.

   O nome da tabela e o nome de cada coluna NUNCA vem do cliente: vem deste
   mapa. O que chega da requisicao e so o VALOR, sempre por parametro ($n).
   Isso fecha a porta de injecao que um "upsert generico" normalmente abre.
=========================================================================== */

type Tipo = "texto" | "num" | "int" | "data" | "bool" | "uuid";
type Def = {
  tabela: string;
  colunas: { n: string; t: Tipo }[];
  obrigatorias: string[];
  rotulo: string;
};

export const CADASTROS: Record<string, Def> = {
  predio: {
    tabela: "predio", rotulo: "Prédio",
    obrigatorias: ["nome", "codigo", "endereco"],
    colunas: [
      { n: "nome", t: "texto" }, { n: "codigo", t: "texto" }, { n: "endereco", t: "texto" },
      { n: "tipo", t: "texto" }, { n: "cidade", t: "texto" }, { n: "uf", t: "texto" },
      { n: "pavimentos", t: "int" }, { n: "area_m2", t: "num" },
      { n: "latitude", t: "num" }, { n: "longitude", t: "num" }, { n: "ativo", t: "bool" },
    ],
  },
  ativo: {
    tabela: "ativo", rotulo: "Ativo",
    obrigatorias: ["nome", "codigo", "predio_id"],
    colunas: [
      { n: "predio_id", t: "uuid" }, { n: "setor_id", t: "uuid" },
      { n: "nome", t: "texto" }, { n: "codigo", t: "texto" }, { n: "tombamento", t: "texto" },
      { n: "categoria", t: "texto" }, { n: "situacao", t: "texto" }, { n: "criticidade", t: "texto" },
      { n: "pavimento", t: "texto" }, { n: "localizacao", t: "texto" },
      { n: "fabricante", t: "texto" }, { n: "modelo", t: "texto" }, { n: "numero_serie", t: "texto" },
      { n: "data_aquisicao", t: "data" }, { n: "valor_aquisicao", t: "num" },
      { n: "garantia_ate", t: "data" }, { n: "observacoes", t: "texto" },
    ],
  },
  contratada: {
    tabela: "contratada", rotulo: "Contratada",
    obrigatorias: ["razao_social", "cnpj"],
    colunas: [
      { n: "razao_social", t: "texto" }, { n: "cnpj", t: "texto" },
      { n: "especialidade", t: "texto" }, { n: "telefone", t: "texto" },
      { n: "email", t: "texto" }, { n: "responsavel", t: "texto" },
      { n: "numero_contrato", t: "texto" }, { n: "contrato_inicio", t: "data" },
      { n: "contrato_fim", t: "data" }, { n: "valor_contrato", t: "num" },
      { n: "avaliacao", t: "num" }, { n: "ativo", t: "bool" },
    ],
  },
  plano: {
    tabela: "plano", rotulo: "Plano de manutenção",
    obrigatorias: ["nome", "tipo", "predio_id", "periodicidade"],
    colunas: [
      { n: "nome", t: "texto" }, { n: "tipo", t: "texto" }, { n: "periodicidade", t: "texto" },
      { n: "predio_id", t: "uuid" }, { n: "contratada_id", t: "uuid" }, { n: "checklist_id", t: "uuid" },
      { n: "proxima_execucao", t: "data" }, { n: "prazo_sla_horas", t: "int" },
      { n: "custo_estimado", t: "num" },
    ],
  },
  item_estoque: {
    tabela: "item_estoque", rotulo: "Item de estoque",
    obrigatorias: ["codigo", "nome", "unidade"],
    colunas: [
      { n: "codigo", t: "texto" }, { n: "nome", t: "texto" }, { n: "categoria", t: "texto" },
      { n: "unidade", t: "texto" }, { n: "localizacao", t: "texto" }, { n: "predio_id", t: "uuid" },
      { n: "quantidade", t: "num" }, { n: "quantidade_minima", t: "num" }, { n: "custo_unitario", t: "num" },
    ],
  },
};

function coagir(t: Tipo, v: any) {
  if (v === undefined || v === null || v === "") return null;
  switch (t) {
    case "int": { const n = parseInt(String(v), 10); return Number.isFinite(n) ? n : null; }
    case "num": { const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : null; }
    case "bool": return v === true || v === "true" || v === "on" || v === "1";
    case "data": return String(v).slice(0, 10);
    case "uuid": return String(v);
    default: return String(v).trim() || null;
  }
}

export async function salvarCadastro(
  ctx: Contexto, entidade: string, dados: Record<string, any>, id?: string | null,
) {
  const def = CADASTROS[entidade];
  if (!def) throw new Error("Entidade nao permitida.");

  const valores: Record<string, any> = {};
  for (const col of def.colunas) {
    if (Object.prototype.hasOwnProperty.call(dados, col.n)) {
      valores[col.n] = coagir(col.t, dados[col.n]);
    }
  }
  for (const o of def.obrigatorias) {
    const criando = !id;
    if ((criando && valores[o] == null) || (!criando && o in valores && valores[o] == null)) {
      throw new Error(`CAMPO_OBRIGATORIO:${o}`);
    }
  }

  const nomes = Object.keys(valores);
  if (!nomes.length) throw new Error("Nada a salvar.");

  return comContexto(ctx, async (c) => {
    if (id) {
      const sets = nomes.map((n, i) => `${n} = $${i + 3}`);
      sets.push(`atualizado_por = $${nomes.length + 3}`, "atualizado_em = now()");
      const { rows } = await c.query(
        `update manutencao.${def.tabela} set ${sets.join(", ")}
          where tenant_id = $1 and id = $2 and excluido_em is null
          returning id`,
        [ctx.tenantId, id, ...nomes.map((n) => valores[n]), ctx.usuarioId || null],
      );
      if (!rows[0]) throw new Error(`${def.rotulo} nao encontrado.`);
      return { id: rows[0].id, criado: false };
    }

    const cols = ["tenant_id", ...nomes, "criado_por"];
    const marc = cols.map((_, i) => `$${i + 1}`);
    const { rows } = await c.query(
      `insert into manutencao.${def.tabela} (${cols.join(", ")})
       values (${marc.join(", ")}) returning id`,
      [ctx.tenantId, ...nomes.map((n) => valores[n]), ctx.usuarioId || null],
    );
    return { id: rows[0].id, criado: true };
  });
}
