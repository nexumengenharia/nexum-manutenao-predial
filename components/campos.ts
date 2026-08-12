import type { CampoDef } from "./cadastro";

/* Definicao dos formularios. Fica separado do componente para que a lista de
   opcoes acompanhe exatamente os CHECK constraints do banco — se divergir, o
   Postgres rejeita e o usuario ve "valor nao aceito" sem entender o porque. */

const op = (...vs: string[]) =>
  vs.map((v) => ({ v, t: v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ") }));

export const CAMPOS_PREDIO: CampoDef[] = [
  { nome: "nome", rotulo: "Nome do prédio", obrigatorio: true, largura: "cheia" },
  { nome: "codigo", rotulo: "Código interno", obrigatorio: true,
    ajuda: "Identificador curto e único, ex.: FCM-01" },
  { nome: "tipo", rotulo: "Tipo", tipo: "selecao", padrao: "FORUM",
    opcoes: op("SEDE", "FORUM", "ANEXO", "ARQUIVO", "DEPOSITO", "GARAGEM", "CENTRO_TREINAMENTO", "OUTRO") },
  { nome: "endereco", rotulo: "Endereço", obrigatorio: true, largura: "cheia" },
  { nome: "cidade", rotulo: "Cidade" },
  { nome: "uf", rotulo: "UF", ajuda: "Duas letras, ex.: AM" },
  { nome: "pavimentos", rotulo: "Pavimentos", tipo: "numero", passo: "1" },
  { nome: "area_m2", rotulo: "Área (m²)", tipo: "numero" },
  { nome: "latitude", rotulo: "Latitude", tipo: "numero",
    ajuda: "Opcional — usado para posicionar o prédio no mapa" },
  { nome: "longitude", rotulo: "Longitude", tipo: "numero" },
  { nome: "ativo", rotulo: "Prédio em uso", tipo: "sim_nao" },
];

export const camposAtivo = (predios: { id: string; nome: string }[]): CampoDef[] => [
  { nome: "nome", rotulo: "Nome do equipamento", obrigatorio: true, largura: "cheia" },
  { nome: "codigo", rotulo: "Código", obrigatorio: true,
    ajuda: "Único no órgão. Vira o QR do equipamento." },
  { nome: "tombamento", rotulo: "Nº de tombamento" },
  { nome: "predio_id", rotulo: "Prédio", tipo: "selecao", obrigatorio: true,
    opcoes: predios.map((p) => ({ v: p.id, t: p.nome })) },
  { nome: "categoria", rotulo: "Categoria", tipo: "selecao", padrao: "OUTROS",
    opcoes: op("CIVIL", "ELETRICA", "ELETRONICA", "HIDRAULICA", "SANITARIA",
               "REFRIGERACAO", "ELEVADOR", "COMBATE_INCENDIO", "OUTROS") },
  { nome: "situacao", rotulo: "Situação", tipo: "selecao", padrao: "OPERANTE",
    opcoes: op("OPERANTE", "EM_MANUTENCAO", "PARADO", "BAIXADO") },
  { nome: "criticidade", rotulo: "Criticidade", tipo: "selecao", padrao: "MEDIA",
    opcoes: op("BAIXA", "MEDIA", "ALTA"),
    ajuda: "Alta = parada interrompe o atendimento ao público" },
  { nome: "pavimento", rotulo: "Pavimento" },
  { nome: "localizacao", rotulo: "Localização", largura: "cheia",
    ajuda: "Onde exatamente está, ex.: casa de máquinas do 3º andar" },
  { nome: "fabricante", rotulo: "Fabricante" },
  { nome: "modelo", rotulo: "Modelo" },
  { nome: "numero_serie", rotulo: "Número de série" },
  { nome: "data_aquisicao", rotulo: "Data de aquisição", tipo: "data" },
  { nome: "valor_aquisicao", rotulo: "Valor de aquisição (R$)", tipo: "numero",
    ajuda: "Base para calcular quanto já se gastou em relação ao valor do bem" },
  { nome: "garantia_ate", rotulo: "Garantia até", tipo: "data" },
  { nome: "observacoes", rotulo: "Observações", tipo: "area" },
];

export const camposItemEstoque = (predios: { id: string; nome: string }[]): CampoDef[] => [
  { nome: "codigo", rotulo: "Código", obrigatorio: true, ajuda: "Único no almoxarifado" },
  { nome: "nome", rotulo: "Nome do item", obrigatorio: true, largura: "cheia" },
  { nome: "categoria", rotulo: "Categoria", ajuda: "Ex.: elétrica, hidráulica, EPI" },
  { nome: "unidade", rotulo: "Unidade", obrigatorio: true, ajuda: "Ex.: UN, CX, M, L, KG", padrao: "UN" },
  { nome: "predio_id", rotulo: "Prédio / almoxarifado", tipo: "selecao",
    opcoes: predios.map((p) => ({ v: p.id, t: p.nome })) },
  { nome: "localizacao", rotulo: "Localização", ajuda: "Ex.: prateleira B3" },
  { nome: "quantidade", rotulo: "Quantidade inicial", tipo: "numero", padrao: "0" },
  { nome: "quantidade_minima", rotulo: "Quantidade mínima", tipo: "numero",
    ajuda: "Abaixo disso o item entra em nível crítico" },
  { nome: "custo_unitario", rotulo: "Custo unitário (R$)", tipo: "numero" },
];

export const CAMPOS_CONTRATADA: CampoDef[] = [
  { nome: "razao_social", rotulo: "Razão social", obrigatorio: true, largura: "cheia" },
  { nome: "cnpj", rotulo: "CNPJ", obrigatorio: true },
  { nome: "especialidade", rotulo: "Especialidade", tipo: "selecao", padrao: "GERAL",
    opcoes: op("CIVIL", "ELETRICA", "ELETRONICA", "HIDRAULICA", "SANITARIA",
               "REFRIGERACAO", "ELEVADOR", "COMBATE_INCENDIO", "GERAL") },
  { nome: "responsavel", rotulo: "Responsável / preposto" },
  { nome: "telefone", rotulo: "Telefone" },
  { nome: "email", rotulo: "E-mail" },
  { nome: "numero_contrato", rotulo: "Nº do contrato" },
  { nome: "contrato_inicio", rotulo: "Início da vigência", tipo: "data" },
  { nome: "contrato_fim", rotulo: "Fim da vigência", tipo: "data",
    ajuda: "Alimenta o alerta de contrato vencendo em 90 dias" },
  { nome: "valor_contrato", rotulo: "Valor do contrato (R$)", tipo: "numero" },
  { nome: "avaliacao", rotulo: "Avaliação (0 a 5)", tipo: "numero", passo: "0.1" },
  { nome: "ativo", rotulo: "Contrato vigente", tipo: "sim_nao" },
];
