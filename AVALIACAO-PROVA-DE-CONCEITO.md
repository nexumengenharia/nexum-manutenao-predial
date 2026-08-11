# Avaliação de Prova de Conceito
## Sistema de Gestão de Manutenção Predial — Nexum

**Data:** 10/08/2026
**Escopo:** avaliação funcional independente, módulo a módulo, com correção dos defeitos encontrados.
**Base de teste:** Supabase PostgreSQL 17.6, dois tribunais (TJAM e TCMAM), 438 ordens, 126 ativos, 171 controles, 10 veículos.

---

## 1. Veredito

| | |
|---|---|
| Situação inicial | **Reprovada** |
| Situação após correções | **Aprovada com ressalvas** |
| Defeitos encontrados | 13 |
| Defeitos corrigidos | 13 |
| Ressalvas remanescentes | 4 (documentadas na seção 7) |

O sistema chegou à avaliação com a camada de leitura madura e a camada de escrita
praticamente inexistente. Havia ainda uma **falha de isolamento entre tribunais**
que, isolada, já reprovaria a prova de conceito.

---

## 2. Inventário de funcionalidades

25 rotas, agrupadas em 7 módulos.

### Módulo 1 — Visão geral
| Funcionalidade | Rota | Entrada de dados | Saída |
|---|---|---|---|
| Painel do gestor | `/` | derivada | 8 alertas acionáveis, 6 KPIs, 5 gráficos, 6 rankings |
| Carteira de serviços | `/carteira` | derivada | fila ordenada por idade/custo/prioridade |
| Relatórios | `/relatorios` | derivada | custo por prédio, setor, tipo |

### Módulo 2 — Atendimento
| Funcionalidade | Rota | Entrada de dados | Saída |
|---|---|---|---|
| Quadro de atividades | `/quadro` | QR público / portal | kanban por situação, roteado por equipe |
| Mover chamado | `POST /api/solicitacoes/[id]/situacao` | ação do fiscal | muda coluna do kanban |
| Solicitações | `/solicitacoes` | derivada | lista auditável, inclusive encerradas |
| Ordens de serviço | `/ordens` | derivada | lista com 7 filtros |
| Ficha da ordem | `/ordens/[id]` | derivada | identificação, execução, custo, checklist, comentários |
| Mudar situação da OS | `POST /api/ordens/[id]/situacao` | ação do técnico/fiscal | registra custo, horas, nota, parecer |

### Módulo 3 — Patrimônio
| Funcionalidade | Rota | Entrada de dados | Saída |
|---|---|---|---|
| Lista de ativos | `/ativos` | cadastro | cards agrupados por categoria ou prédio |
| Ficha do ativo | `/ativos/[id]` | cadastro | custo acumulado, % do valor do bem, controles, histórico |
| Cadastro de ativo | `POST /api/cadastros/ativo` | **formulário** | grava em `manutencao.ativo` |
| Prédios e mapa | `/predios` | cadastro | mapa geográfico + indicadores por imóvel |
| Cadastro de prédio | `POST /api/cadastros/predio` | **formulário** | grava em `manutencao.predio` |
| Pontos com QR | `/pontos` | cadastro | pontos de serviço e chamados por ponto |
| Planos e PMOC | `/planos` | cadastro | planos preventivos |
| Controles e vencimentos | `/controles` | cadastro | o que vence, quando, quanto custa |

### Módulo 4 — Frota
| Funcionalidade | Rota | Entrada de dados | Saída |
|---|---|---|---|
| Lista de veículos | `/frota` | cadastro | consumo, multas, preventivas, documentos |
| Ficha do veículo | `/frota/[id]` | cadastro + telemetria | abastecimento, inspeções, trajeto |
| Monitoramento | `/frota/monitoramento` | telemetria Traccar | mapa ao vivo, eventos sem tratativa |

### Módulo 5 — Administração
| Funcionalidade | Rota | Entrada de dados | Saída |
|---|---|---|---|
| Contratadas | `/contratadas` | **formulário** | contratos, vigência, SLA por empresa |
| Medições | `/medicoes` | derivada de OS | competências e valores |
| Espelho da medição | `/medicoes/[id]` | derivada | ordens incluídas, glosas, base de ateste |
| Estoque | `/estoque` | movimentação | saldo e ponto de reposição |
| Auditoria | `/auditoria` | automática | trilha de alterações e acessos |
| Usuários | `/usuarios` | cadastro | perfis e papéis |

### Módulo 6 — Canais públicos (sem login)
| Funcionalidade | Rota | Entrada de dados | Saída |
|---|---|---|---|
| QR do ponto de serviço | `/ponto/[codigo]` | **usuário do prédio** | chamado roteado por natureza |
| QR do ativo | `/ativo/[codigo]` | **usuário do prédio** | chamado vinculado ao equipamento |

### Módulo 7 — Plataforma
| Funcionalidade | Rota |
|---|---|
| Autenticação JWT | `POST /api/auth/login`, `/api/auth/sair` |
| Verificação de saúde | `GET /api/saude` |
| Tema claro/escuro, menu recolhível, responsividade | transversal |

---

## 3. Plano de teste

| # | Teste | Método | Critério de aprovação |
|---|---|---|---|
| T01 | Integridade do modelo | conferir as 40 tabelas/views referenciadas no código | todas existem |
| T02 | Navegação | casar todo `href` com as rotas existentes | zero links órfãos |
| T03 | Filtros de tela | conferir se cada parâmetro de URL é lido pela página | nenhum filtro ignorado em silêncio |
| T04 | Escrita — chamado por QR de ponto | INSERT real em transação, com rollback | registro criado e roteado à equipe |
| T05 | Escrita — chamado por QR de ativo | INSERT real, rollback | registro criado |
| T06 | Escrita — mover chamado | UPDATE real, rollback | situação alterada |
| T07 | Escrita — cadastro de prédio | INSERT real, rollback | registro criado |
| T08 | Escrita — cadastro de ativo | INSERT real, rollback | registro criado com QR gerado |
| T09 | Escrita — cadastro de contratada | INSERT + UPDATE real, rollback | criação e edição funcionam |
| T10 | **Isolamento entre tribunais** | mesma consulta sob dois `tenant_id` | cada um vê só o seu |
| T11 | Acesso direto por UUID (IDOR) | rota `[id]` com registro de outro tribunal | nega acesso |
| T12 | Rota inexistente sob segmento dinâmico | `/frota/monitoramento` | não derruba a aplicação |
| T13 | Compilação e tipos | build de produção na Vercel | compila sem erro |
| T14 | Normalização de datas | datas do Postgres nos campos de edição | campo preenchido corretamente |

---

## 4. Defeitos encontrados

### Críticos

**D01 — Vazamento de dados entre tribunais**
As 14 consultas do painel e 27 consultas embutidas nas telas confiavam apenas na
Row Level Security. Só que a aplicação conecta como `postgres`, papel que tem
`rolbypassrls = true` — as policies existiam e nunca eram aplicadas.

Evidência: TJAM possui 214 ordens e TCMAM 224. O painel de um administrador do
TJAM exibia **438** — a soma dos dois tribunais. O mesmo valia para ativos,
veículos, controles, quadro de atividades e mapa.

> Observação: forçar RLS (`FORCE ROW LEVEL SECURITY`) não resolveria, porque
> `rolbypassrls` prevalece sobre o FORCE.

**Correção:** toda consulta passou a carregar `tenant_id = manutencao.tenant_atual()`,
a mesma expressão da policy, lida do `app.tenant_id` que a transação já gravava.
O filtro deixou de ser implícito e passou a ser verificável.

**D02 — Acesso a veículo de outro tribunal por UUID (IDOR)**
`/frota/[id]` buscava `where v.id = $1` sem checar o tribunal. Quem conhecesse o
UUID abria a ficha completa de um veículo alheio.
**Correção:** filtro de tribunal na consulta; fora do tribunal retorna 404.

**D03 — `/frota/monitoramento` derrubava a aplicação**
A rota era referenciada pelo menu e pelo alerta de frota do painel, mas não
existia. Caía no segmento dinâmico `/frota/[id]`, que tentava ler
`"monitoramento"` como UUID e provocava erro 500 do Postgres
(`invalid input syntax for type uuid`).
**Correção:** página de monitoramento criada; por ser segmento estático, tem
precedência sobre o dinâmico.

### Altos

**D04 — Camada de escrita desconectada**
As funções de escrita existiam em `acoes.ts`, mas **nenhuma era chamada**. O
sistema tinha 3 rotas de API (login, logout, saúde) e as pastas
`/api/solicitacoes`, `/api/publico`, `/api/ordens` e `/api/integracao` estavam
vazias. Consequência: botões de mover card e os dois formulários de QR
respondiam 404 silenciosamente.
**Correção:** 5 rotas criadas e ligadas às funções existentes.

**D05 — Sem cadastro de prédio, ativo e contratada**
Só era possível popular o sistema por SQL direto.
**Correção:** formulários de cadastro e edição, com whitelist de colunas.

**D06 a D08 — Telas de detalhe inexistentes**
`/ordens/[id]`, `/ativos/[id]` e `/medicoes/[id]` eram linkadas em 9 lugares
(inclusive duas vezes no painel) e retornavam 404. As consultas
(`obterOrdem`, `obterAtivo`, `obterMedicao`, `checklistDaOrdem`,
`historicoDoAtivo`, `ordensDaMedicao`) já existiam e nunca haviam sido usadas.
**Correção:** três páginas criadas sobre as consultas existentes.

**D09 — `/solicitacoes` e `/contratadas` no menu sem página**
**Correção:** ambas criadas.

### Médios

**D10 — Filtros ignorados em silêncio**
`/ordens?predio=`, `?atraso=1` e `?mes=` eram gerados pelo painel mas não lidos
pela tela: o gestor clicava num recorte e recebia a lista inteira, acreditando
estar vendo o recorte. Pior que um erro visível.
**Correção:** filtros implementados, com aviso do recorte ativo e botão de limpar.

**D11 — Constante de tema importada de módulo cliente**
`SCRIPT_APARENCIA` vinha de um arquivo `"use client"` e era injetada por um
Server Component — nesse caminho o valor chega como referência de cliente, não
como texto, e o script sairia quebrado no HTML.
**Correção:** movida para `lib/aparencia.ts`, módulo neutro.

**D12 — Datas em branco na edição**
O driver do Postgres devolve `date` como objeto `Date`; `String(Date).slice(0,10)`
produz `"Wed Jan 0"`, que `input[type=date]` descarta.
**Correção:** normalização em UTC (testada inclusive no fuso de Manaus).

**D13 — Sem viewport para celular**
Faltava a meta `viewport`. O Android renderizava numa viewport virtual de 980px
e encolhia tudo, deixando o sistema ilegível no telefone.
**Correção:** viewport declarada; menu do celular virou barra rolável com ícones.

---

## 5. Resultado dos testes

| # | Teste | Resultado | Evidência |
|---|---|---|---|
| T01 | Integridade do modelo | **Passou** | 40/40 tabelas e views presentes |
| T02 | Navegação | **Passou** | 25 rotas, zero links órfãos |
| T03 | Filtros de tela | **Passou** | nenhum parâmetro ignorado |
| T04 | Chamado por QR de ponto | **Passou** | `SOL-TESTE-0001`, equipe Zeladoria e Limpeza |
| T05 | Chamado por QR de ativo | **Passou** | `SOL-TESTE-0002` |
| T06 | Mover chamado | **Passou** | situação → TRIAGEM |
| T07 | Cadastro de prédio | **Passou** | registro criado |
| T08 | Cadastro de ativo | **Passou** | criado com `codigo_publico` automático |
| T09 | Cadastro de contratada | **Passou** | criação e edição |
| T10 | **Isolamento entre tribunais** | **Passou** | TJAM 214 / TCMAM 224 / sem filtro 438 |
| T11 | Acesso por UUID (IDOR) | **Passou** | fora do tribunal retorna 404 |
| T12 | Rota sob segmento dinâmico | **Passou** | não há mais erro 500 |
| T13 | Compilação | **Passou** | build da Vercel sem erro |
| T14 | Normalização de datas | **Passou** | `Date` → `2027-01-01` |

Todas as escritas foram testadas com INSERT/UPDATE reais contra o banco de
produção, dentro de transação revertida ao final — sem deixar resíduo.

---

## 6. Resposta à pergunta central

> *"Quando eu zerar os dados fictícios, vou ter estrutura para colocar os dados
> reais e o sistema funcionar?"*

**Os indicadores são calculados, não decorativos.** Cada número do painel vem de
uma consulta SQL contra as tabelas. Zerando a base, tudo vai a zero e recalcula
sozinho conforme o dado real entra.

De onde vem cada indicador que você citou:

| Indicador | Origem | Quem preenche |
|---|---|---|
| Custo por prédio | `ordem.custo_real` somado por `predio_id` | fiscal, ao concluir a OS |
| Ativo que mais consome | `ordem.custo_real` por `ativo_id`, comparado a `ativo.valor_aquisicao` | fiscal ao concluir; valor do bem no cadastro do ativo |
| Vencimentos e controles | `controle.proxima_data` e `situacao` | cadastro de controle |
| Carga por equipe | `solicitacao` agrupada por `equipe_id` | automático, pelo roteamento do QR |
| Contratos vencendo | `contratada.contrato_fim` | cadastro de contratada |
| SLA | `concluida_em` × `prazo_em` | automático |
| Nota de qualidade | `ordem.nota_qualidade` | fiscal, ao concluir |

**O ponto de atenção:** quase todo indicador financeiro depende de o fiscal
lançar o custo ao concluir a ordem. Por isso o custo passou a ser pedido no mesmo
gesto de concluir, e não numa tela separada — ordem concluída sem custo não entra
em nenhum indicador.

---

## 7. Ressalvas remanescentes

**R01 — Cadastros ainda faltantes (alto)**
Ainda não há tela para cadastrar **controle de vencimento, veículo, equipe,
usuário, ponto de QR, setor, plano e item de estoque**. A estrutura está pronta
(basta acrescentar a definição no mapa `CADASTROS` de `acoes.ts`), mas hoje esses
registros só entram por SQL. Sem controle e sem ponto cadastrados, dois dos
módulos mais visíveis nascem vazios em produção.

**R02 — Isolamento por filtro explícito, não por RLS (médio)**
A correção do D01 é correta e verificável, mas depende de cada consulta futura
lembrar do filtro. O caminho definitivo é criar um papel de aplicação **sem**
`rolbypassrls`, conceder a ele apenas `SELECT/INSERT/UPDATE` (nunca `DELETE`, o
que já reforça a regra de exclusão lógica), trocar a `DATABASE_URL` e converter
as duas buscas públicas de QR em funções `SECURITY DEFINER`. A partir daí o banco
passa a impedir o vazamento sozinho.

**R03 — Integração Traccar não conectada (médio)**
`/api/integracao` continua vazia. A tela de monitoramento e as colunas de
telemetria existem, mas nada alimenta `veiculo_posicao` automaticamente.

**R04 — Anexos e fotos sem upload (baixo)**
A tabela `anexo` é lida (a lista de ativos busca foto de capa), mas não há tela
de upload.

---

## 8. Correções aplicadas nesta rodada

**Arquivos criados (12)**
`app/(app)/ordens/[id]/page.tsx` · `app/(app)/ordens/[id]/situacao.tsx` ·
`app/(app)/ativos/[id]/page.tsx` · `app/(app)/medicoes/[id]/page.tsx` ·
`app/(app)/solicitacoes/page.tsx` · `app/(app)/contratadas/page.tsx` ·
`app/(app)/frota/monitoramento/page.tsx` · `app/api/ordens/[id]/situacao/route.ts` ·
`app/api/solicitacoes/[id]/situacao/route.ts` · `app/api/publico/ponto/route.ts` ·
`app/api/publico/chamado/route.ts` · `app/api/cadastros/[entidade]/route.ts`

**Arquivos alterados (15)**
`lib/servicos/painel.ts` (14 consultas) · `lib/servicos/consultas.ts` ·
`lib/servicos/acoes.ts` · `lib/aparencia.ts` · `app/layout.tsx` ·
`app/(app)/layout.tsx` · `app/globals.css` · `tailwind.config.ts` ·
`components/ui.tsx` · `components/chrome.tsx` · `components/cadastro.tsx` ·
`components/campos.ts` · e as telas de ativos, prédios, pontos, controles, frota
e quadro (filtro de tribunal).

---

*Avaliação conduzida por inspeção de código, verificação de integridade do
esquema e execução de transações reais contra a base de produção, revertidas ao
final de cada teste.*
