# StructBot — painel público

Rota: `/structbot`. O header e o rodapé oferecem acesso ao painel; o item destacado fica ao lado de Desenvolvimento. A página e seu CSS são carregados sob demanda.

O painel reúne o boletim publicado e as últimas dez publicações, atividade dos projetos, contagens do inventário, issues e PRs com busca/etiqueta/projeto/situação e paginação, frentes de trabalho, recomendações, releases, evidências e situação das fontes. Temas claro/escuro e layout responsivo reutilizam a identidade do site.

## Integração e deploy

Não é necessário cadastrar tokens nem novas variáveis de ambiente no frontend. O navegador consulta exclusivamente `/structbot-api/...`, encaminhado para `https://api.openstruct.com.br/api/v1/public/...`:

- Vercel: rewrite específico antes do fallback da SPA em `vercel.json`.
- Netlify: proxy específico antes do fallback da SPA em `netlify.toml`.
- Desenvolvimento: proxy do Vite em `vite.config.ts` (`npm run dev`).

Essa mesma origem permite testar previews sem abrir o CORS da API a domínios arbitrários. O destino é fixo e restrito ao namespace público. Não existe encaminhamento para `/admin` nem credenciais no bundle. A CSP existente permanece restritiva. Em outro servidor de arquivos estáticos, configure um reverse proxy equivalente para `/structbot-api/` antes da regra da SPA; `vite preview` por si só não configura o proxy de produção.

Nenhuma visita dispara geração de relatórios. O frontend só faz GET. OpenAI, GitHub e os tokens de administração permanecem no backend.

## Atualização e limites

- Consultas independentes por seção, timeout de 15 segundos e cancelamento quando a rota/filtros mudam. Uma falha não derruba as outras seções nem se transforma em zero.
- Atualização a cada 60 segundos e até uma invalidação por lote de eventos a cada 10 segundos. A coleta original do GitHub continua seguindo o agendamento do backend.
- SSE em `/events/stream`, evento `development`; reconexão nativa com `Last-Event-ID`. O feed preserva o cursor ao pausar/retomar e mantém apenas 60 eventos em memória, sem cache persistente.
- Se o stream falhar, consultas REST a cada 30 segundos drenam o histórico em ordem crescente (até dez páginas de 100 por ciclo), deduplicam e exibem os mais recentes recebidos. A recuperação de um histórico grande pode levar mais de um ciclo.
- Pausar e ocultar a aba suspendem o stream e os timers automáticos; atualizar manualmente continua disponível. Requests em andamento podem terminar.
- `/reports/latest` com 404 é um estado vazio esperado; outras falhas mostram indisponibilidade. Histórico retirado de publicação não permanece exibido após uma consulta malsucedida.
- A lista de recomendações é uma janela paginada fornecida pelo backend, que filtra publicabilidade após paginar; ela não oferece contagem total. O seletor de boletins oferece as dez publicações retornadas, não o histórico completo.

## Semântica dos dados

Boletins por regras são identificados como “Resumo automático”; apenas `provider=openai` recebe “Análise por IA”. Avisos preservam `stale`, mudanças de fontes, falhas de coleta e repositórios pendentes. Contagens são globais ao inventário público coletado, não somente à página da tabela.

Atribuição de issue não comprova início de trabalho. Frentes exibem registros explícitos, responsável e fonte. CI desconhecida não significa aprovação; conflitos desconhecidos não são apresentados como resolvidos. PR integrada e release publicada não garantem instalador disponível.

Conteúdo remoto é renderizado como texto React, sem HTML/Markdown executável. Links externos só admitem HTTPS sem credenciais; referências `owner/repo#n` são validadas. Os validadores toleram novos campos, mas rejeitam estruturas incompatíveis. Novas funções da API devem ganhar tipos, validadores e uma seção própria.

## Validação

```bash
npm ci
npm test
npm run build
npm run audit:content
```

Os testes do StructBot cobrem contratos, falhas HTTP/JSON, boletim ausente, parâmetros, URLs, contagens, deduplicação, cursor SSE, fallback paginado e encerramento das conexões. A auditoria também renderiza a nova rota no estado inicial e verifica seus links locais.

## Conversas contextuais e jornal

O topo do painel agora destaca “Últimas notícias do OpenStruct”, com manchete, abertura, notícias por tema, créditos e referências da edição publicada. `content.news` é opcional no cliente para preservar os boletins v1; nesses casos a abertura utiliza o boletim público existente.

A seção “Conversas e responsáveis” consulta `/public/conversations` com filtros de projeto/estado e paginação. Mostra papéis por escopo, ofertas de ajuda, responsabilidade declarada/inferida/incerta, discussões, decisões, correções e citações originais. Atribuições oficiais do GitHub aparecem separadamente. Fontes alteradas ou incompletas e análises pendentes/desabilitadas têm estados explícitos. Nenhuma interação dispara IA ou altera GitHub.

Publique o backend com a migração `0002` antes de integrar esta versão do frontend. O roteiro está no repositório `struct-bot`, em `docs/CONVERSAS-E-JORNAL.md`. O painel continua lendo edições antigas durante a atualização; a seção de conversas ficará indisponível enquanto o servidor ainda não oferecer a nova rota.

Os fixtures em `tests/fixtures/structbot-context.json` usam nomes e conversas fictícios. Os testes de renderização conferem papéis, incerteza, fontes, HTML remoto escapado e compatibilidade entre edições v1/v2.

## Central de tarefas e login

A tabela principal agora é `/api/v1/public/tasks`: todos os sistemas, issues e PRs e todos os estados, sem filtro inicial. Ela tem filtros por sistema/tipo/status/usuário, busca por título/número e atalhos para disponíveis, revisões, bloqueadas, sem responsável e minhas tarefas. Ativos vêm primeiro por prioridade e encerrados ficam ao final. Prioridade ausente/antiga aparece como “A avaliar”. O mantenedor pode registrar correção com justificativa.

O jornal fica no início, com expansão para a edição completa; tabela vem antes do boletim e terminal. Detalhes da tarefa reúnem síntese, referências a outros itens, entrega registrada e histórico público paginado. Assumir é uma ação imediata; bloqueios, entregas e ações do mantenedor usam formulário com nota pública. PRs são reservados para revisão e mostram seu autor separado.

### Dependência de backend e configuração

Publique a versão do backend com migração **0003** antes deste frontend. Consulte `docs/CENTRAL-DE-TAREFAS.md` no repositório `ricardocorsini/struct-bot` para cadastro do OAuth App, configuração do callback, Client ID/Secret, IDs de mantenedores, webhook e atualização do Docker Compose.

**Não há segredo novo no frontend.** Leituras públicas usam o proxy já existente `/structbot-api`. Login abre `https://api.openstruct.com.br/api/v1/auth/github/start`. Sessão e POSTs de contribuidor vão diretamente para a origem fixa `https://api.openstruct.com.br` com cookies e CSRF. Por isso CSP `connect-src` acrescenta somente essa origem em Vercel/Netlify; o proxy público não passa a encaminhar administração ou autenticação.

Configure no backend `TASK_FRONTEND_URL` para a URL canônica pública (`https://openstruct.com.br/structbot` ou `https://www.openstruct.com.br/structbot`). Ambas as origens precisam permanecer permitidas em CORS. Cookies Secure, HttpOnly, host-only e SameSite=Lax pertencem ao subdomínio da API; site e API usam HTTPS e o mesmo domínio registrável. O ID/Secret do OAuth App e o PAT de coleta são credenciais diferentes e ficam apenas no servidor.

Sem login configurado, a tabela é pública e informa que reservas aguardam ativação. Com login, o backend valida propriedade, permissões, versão e concorrência de toda ação. Uma falha de rede não é repetida automaticamente: a tabela é consultada novamente antes de nova tentativa. Um usuário comum não pode concluir/aprovar a própria entrega; enviar a entrega move para revisão.

A tabela consulta o banco a cada visita, em revalidações de um minuto e ao receber eventos. O autor da ação atualiza a tabela após a confirmação; outros navegadores recebem eventos do backend e revalidam com agrupamento de um segundo. Queda do stream mantém fallback de consulta de eventos. Isso não envia requisições OpenAI pelo navegador.

### Validação

Testes cobrem contrato, disponibilidade por identidade/papel, origem fixa, cookies/CSRF, envio de versão, rejeição de respostas inválidas, conflito 409 e ausência de repetição automática. A interface é conferida com dados fictícios locais; a ativação real do OAuth depende do cadastro e configuração no servidor.
