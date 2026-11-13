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
