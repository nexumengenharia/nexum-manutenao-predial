# Manual de uso — Gestão de Manutenção Predial

## 1. O básico: o que o sistema faz, em 4 passos

1. **Alguém relata um problema** — por QR code (usuário do prédio, sem login) ou
   direto pelo gestor no sistema.
2. **Isso vira uma "solicitação"**, que aparece no **Quadro de atividades**
   esperando triagem.
3. **A equipe triagem transforma em Ordem de Serviço (OS)** — é a OS que tem
   descrição técnica, peças, prazo, custo e histórico.
4. **A OS é executada e concluída**, com custo e nota de qualidade lançados —
   é esse lançamento que alimenta todos os gráficos do painel.

Tudo que você vê no painel (custo por prédio, ativo que mais consome, SLA)
nasce do passo 4. Sem concluir OS com custo lançado, os gráficos ficam vazios.

---

## 2. Onde fazer cada coisa

| Eu quero... | Vá em |
|---|---|
| Registrar um problema relatado por telefone/presencialmente | **Quadro de atividades** → botão "Nova solicitação" |
| Ver os chamados aguardando triagem | **Quadro de atividades** |
| Transformar uma solicitação em Ordem de Serviço | **Quadro de atividades** → abrir o card → "Converter em OS" |
| Ver todas as OS abertas, filtrar por prédio/tipo/atraso | **Ordens de serviço** |
| Ver o detalhe completo de uma OS (descrição, peças, checklist, custo) | Clique no número da OS em qualquer lista |
| Concluir uma OS e lançar o custo | Abra a OS → botão de mudar situação → "Concluir" |
| Cadastrar um prédio novo | **Prédios e mapa** → "Novo prédio" |
| Cadastrar um ativo (equipamento) novo | **Ativos** → "Novo ativo" |
| Ver quanto um ativo já custou | **Ativos** → clique no card do ativo |
| Cadastrar uma empresa contratada | **Contratadas** → "Nova contratada" |
| Ver o que está vencendo (extintor, laudo, contrato) | **Controles e vencimentos** |
| Ver a frota e a posição dos veículos | **Frota** → **Monitoramento** |
| Ver quem alterou o quê no sistema | **Auditoria** |

---

## 3. Carteira × Quadro × Ordens — a confusão mais comum

São três recortes da **mesma fila de trabalho**, cada um respondendo uma
pergunta diferente:

**Quadro de atividades** — "o que chegou agora e ainda não virou trabalho
formal?" É onde a solicitação nasce (por QR ou manual) e é triada. Granularidade
fina: natureza do problema, quem relatou, onde exatamente.

**Carteira de serviços** — "das OS já abertas, quais estão envelhecendo?"
Ranking por idade e custo, para o gestor decidir prioridade do dia. Só mostra
OS que já existem — não é onde se cria nada.

**Ordens de serviço** — "a lista completa e pesquisável de tudo". Onde você
filtra por prédio, tipo, situação, período, e abre o detalhe técnico de
qualquer OS específica.

Fluxo: **solicitação (Quadro) → vira OS (Ordens) → aparece na Carteira
enquanto estiver aberta.**

---

## 4. Onde triar e onde descrever a OS

- **Triagem**: no Quadro de atividades, cada card tem os botões de mover
  situação (Triar / Executar / Concluir). Triar é decidir que aquele relato
  é um problema real e definir prioridade.
- **Converter em Ordem de Serviço**: dentro do card triado, ou na ficha da
  solicitação — a conversão cria a OS com número próprio.
- **Descrever atividades, peças, checklist**: dentro da **ficha da OS**
  (clique no número dela). Lá tem descrição do serviço, checklist técnico
  (quando a OS nasce de um plano preventivo) e histórico de comentários.

---

## 5. Módulos explicados

### Planos e PMOC
"Plano" é uma receita de manutenção preventiva recorrente: o quê fazer, em
que ativo, com que periodicidade (mensal, trimestral...) e com qual
checklist técnico. PMOC é o nome legal desse plano quando aplicado a
climatização (Plano de Manutenção, Operação e Controle — obrigatório por lei
para ar-condicionado). Na prática: você cadastra o plano uma vez, e ele é
quem *deveria* gerar as OS preventivas automaticamente na periodicidade
certa — hoje essa geração automática ainda não está implementada; o módulo
serve para consulta do que está planejado.

### Medições e faturamento
É o processo de fechar quanto pagar a uma contratada por mês. O sistema
junta todas as OS que aquela empresa concluiu numa competência (mês),
soma o custo, permite aplicar glosa (desconto por serviço fora do prazo ou
mal executado) e gera o valor líquido a pagar. O fiscal "atesta" a medição
antes de seguir para pagamento. Pense nela como a fatura mensal da
contratada, montada automaticamente a partir das OS que ela já concluiu.

---

## 6. Perfis e o que cada um pode fazer

| Perfil | Pode |
|---|---|
| ADMIN | Tudo, incluindo cadastrar usuários |
| GESTOR | Cadastrar prédios/ativos/contratadas, triar, concluir OS, gerenciar medições |
| FISCAL | Triar, mudar situação de OS, atestar medição |
| TECNICO | Mudar situação de OS (executar/concluir), comentar |
| CONTRATADA | Comentar em OS |
| CONSULTA | Só visualizar |

---

*Este manual acompanha o estado do sistema em 10/08/2026. Alguns itens
citados na avaliação técnica (controles, veículos, equipes, usuários,
pontos de QR) ainda não têm tela de cadastro própria — só prédio, ativo e
contratada têm.*
