# StructBot como apoio à gestão

Objetivo: ajudar cada colaborador a encontrar uma contribuição útil e ajudar o mantenedor a decidir o que precisa de atenção. O acompanhamento deve resultar em próximos passos verificáveis, além de notícias.

## O que esta mudança entrega

- Jornal como leitura editorial principal e tabela como local para assumir e acompanhar trabalho.
- Recomendações acompanhadas próximas da tabela e do feed de atividade.
- Análise detalhada recolhida, com impedimentos, próximas ações, justificativas, referências e publicações anteriores.
- Histórico carregado somente ao expandir a análise; nenhum custo de IA ao abrir ou expandir o painel.

Reservas, status, prioridades sugeridas, notas e recomendações acompanhadas já têm suporte no sistema. A tabela possui filtros de minhas tarefas, tarefas disponíveis, bloqueadas e itens para revisão. As propostas abaixo são evoluções futuras e não fazem parte desta entrega.

## Evoluções propostas, em ordem

| Prioridade | Evolução | Utilidade diária e critério de entrega |
| --- | --- | --- |
| 1 | **Atenção hoje** | Uma fila curta e agrupada por projeto: PR aguardando revisor, tarefa importante sem responsável, impedimento declarado e reserva sem atualização. Cada alerta mostra o fato, sua data, a fonte, quem pode agir e o próximo passo. A restrição de novas reservas precisa ser respeitada; falta de coleta não deve ser tratada como falta de trabalho. |
| 2 | **Acompanhar uma recomendação até a resolução** | As recomendações já têm estado no backend. Expor decisões do mantenedor pelo login GitHub: aceitar, adiar, descartar com motivo ou vincular a uma issue existente. Ao aceitar, registrar critério de conclusão e o próximo passo; responsabilidade continua vindo de uma reserva explícita. Recomendações iguais entre edições precisam manter identidade, histórico e estado. |
| 3 | **Prioridade com contexto e dependências** | Melhorar a prioridade que a IA já sugere: indicar o que impede outras tarefas, o impacto, a justificativa e a mudança desde a avaliação anterior. Dependência deve ter fonte ou confirmação do mantenedor. Prioridade manual continua prevalecendo, e dados antigos devem ficar sinalizados. |
| 4 | **Próximo passo para cada colaborador** | Evoluir o filtro Minhas tarefas para uma fila pessoal com o que entregar, revisar, ajustar ou esclarecer. Sugestões de novas tarefas devem excluir reservas bloqueadas e trabalho já assumido. A pessoa confirma sua participação; a IA não a atribui automaticamente. |
| 5 | **Memória de decisões** | Vincular decisão, discussão de origem, resultado esperado e tarefas afetadas. Cada nova edição informa o que mudou, o que segue pendente e o que teve resolução comprovada, preservando autoria e evitando recomendações repetidas. |
| 6 | **Saúde do fluxo por projeto** | Mostrar tempo aguardando revisão, impedimentos ativos e entregas concluídas em uma janela explícita. Usar eventos e datas apropriadas, com cobertura visível; não estimar duração a partir apenas da última sincronização nem transformar isso em ranking de pessoas. |

## Como a IA pode atuar

Coleta e registro operacional fornecem os fatos. Regras simples detectam sinais objetivos; a IA interpreta discussões, explica dependências e sugere próximos passos com fontes. Mudanças relevantes podem gerar uma nova avaliação, com deduplicação e orçamento, aproveitando o fluxo de interpretação por alterações que já existe. Visitas ao painel consultam os resultados salvos.

Uma orientação útil deve responder: **o que precisa acontecer, por que agora, qual a fonte e quem pode decidir ou agir**. Quando faltar informação, deve pedir uma definição concreta, como o comportamento esperado ou um critério de aceite. Não deve inventar prazo ou responsável.

O estado das tarefas vem das ações explícitas do painel e do GitHub. Inferências da IA não concluem uma entrega, removem uma restrição de reserva ou mudam atribuições. Validação técnica precisa de evidência adequada; merge e versão publicada são etapas distintas. O mantenedor pode corrigir uma proposta com justificativa, preservando o histórico.

## Próxima implementação sugerida

Começar por **Atenção hoje**, com fatos verificáveis e poucas entradas úteis. Depois acrescentar as ações de acompanhamento de recomendações por sessão autenticada. Isso transforma o diagnóstico existente em uma rotina de gestão sem criar uma segunda tabela de tarefas ou uma segunda definição de responsável.
