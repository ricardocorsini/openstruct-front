# OpenStruct

Frontend do ecossistema OpenStruct: ferramentas abertas para engenharia estrutural. O site apresenta o projeto, o catálogo e as páginas do ConsoloStruct, MolaStruct, ArmaduraStruct e GeoSPT, além das propostas de aplicativos futuros.

Os acessos institucionais levam à central `/development`, onde cada produto tem
seu próprio repositório público. O frontend continua público e aparece explicitamente
como **Código deste site** no rodapé; a licença MIT ali indicada pertence ao site.
Repositórios e licenças dos aplicativos permanecem no registro editorial.

## Desenvolvimento

Requisitos: Node.js 24 LTS e npm.

```sh
npm ci
npm run dev
```

```sh
npm run build     # TypeScript + build de produção
npm run preview   # Servir o build localmente
```

O projeto usa React, TypeScript, Vite e React Router. O CSS é próprio. As fontes são hospedadas localmente; não há serviços externos obrigatórios, autenticação ou backend.

## Páginas

| Endereço                    | Conteúdo                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `/`                         | Apresentação, ArmaduraStruct em destaque, aplicativos, princípios e FAQ             |
| `/apps`                     | Catálogo com busca e filtros; futuros aplicativos identificados como planejamento   |
| `/apps/consolostruct`       | Versão publicada, recursos, escopo do motor, FAQ, prévia SVG e documentação oficial |
| `/apps/molastruct`          | MolaStruct publicado: entradas, métodos, matriz 6×6, capacidade e limites           |
| `/apps/armadurastruct`      | ArmaduraStruct 0.2.0: fluxo CAD, formatos, saídas, licença e limites                |
| `/apps/geosptstruct`       | GeoSPT: sondagens, capacidade de carga de estacas e memoriais                       |
| `/apps/anchorstruct`       | Proposta para chumbadores, com desenvolvimento não iniciado e arte “Em breve”       |
| `/apps/slopestruct`        | Proposta para taludes e contenções, com desenvolvimento não iniciado e arte “Em breve” |
| `/launcher`                 | Downloads oficiais Windows/Linux, versão publicada e instruções de instalação       |
| `/docs`                     | Central de manuais por sistema, com busca e [guia de manutenção](docs/MANUAIS.md)   |
| `/community`                | Formas de contribuir e acompanhar o projeto                                         |
| `/community/como-colaborar` | Manual público passo a passo, com percursos sem código e de código no frontend      |
| `/development/contribuir-com-ia` | Guia com ChatGPT/Codex, Claude e Gemini: ambiente, modelo, fork, issue, prompt e PR |
| Outros endereços            | Página 404 com navegação de retorno                                                 |

ConsoloStruct, MolaStruct, ArmaduraStruct e GeoSPT possuem páginas de produto e aparecem na central de aplicativos. O horizonte futuro contém somente AnchorStruct e SlopeStruct, com páginas informativas, estado “A iniciar” e desenvolvimento não iniciado. Seus cards aparecem somente ao incluir o horizonte futuro; não há repositório, versão, plataforma, download ou data de lançamento. Veja as [decisões de apresentação das propostas](docs/PRODUTOS-PLANEJADOS.md).

## Struct Launcher e downloads

A página `/launcher` consulta o feed público de atualização do próprio launcher:

```text
https://raw.githubusercontent.com/ricardocorsini/openstruct-catalog/main/launcher/latest.json
```

Quando o fluxo de publicação e a sincronização do hub terminam, a página oferece os dois
instaladores reais da versão estável: Windows x86_64 (.exe/NSIS) e Linux x86_64 (AppImage).
Os links não ficam fixos na versão 0.2.0. Uma nova versão do feed atualiza a página na próxima
consulta, sem outro deploy do site. O botão de verificação permite consultar novamente.

Antes da primeira publicação, o feed responde 404 e a página informa que os instaladores
estão em preparação. Falhas de rede ou metadados inválidos mostram um estado de erro com
opção de repetir e link para os lançamentos. Nenhum botão inicia um download inexistente.

O leitor aceita somente URLs HTTPS com os nomes canônicos, produto, repositório, versão e
formatos esperados. Exige os dois pacotes e a presença das assinaturas no feed. A validação
criptográfica dos instaladores e atualizações é feita pelo launcher; o site não apresenta a
validação de formato do feed como uma verificação criptográfica.

Os downloads não exigem login GitHub. A sugestão de sistema é apenas visual: os dois formatos
ficam visíveis, inclusive no celular. macOS/ARM não são anunciados como alvos nativos.

ConsoloStruct, MolaStruct e ArmaduraStruct usam o catálogo público assinado para
versão e disponibilidade. `src/lib/apps.ts` registra a versão que fundamenta a
descrição técnica revisada. A disponibilidade dos produtos é separada da maturidade
de seus métodos e da versão mais recente de seus códigos.
Os endereços e o leitor estão em `src/lib/launcher.ts`. Execute `npm test` para verificar
seleção de arquivos, publicações incompletas, origens inválidas e estados de rede.

A conferência visual incluiu navegação pela home e central de aplicativos, nova consulta ao
feed, temas claro/escuro e layout com largura de 454 px sem rolagem horizontal. O feed oficial
já oferece a primeira versão pública do launcher, 0.2.1, com pacotes assinados no hub. O leitor
real retornou `ready` e a página pública exibiu os dois downloads com as URLs corretas. Novas
releases estáveis entram pelo mesmo feed, sem editar os links do frontend.

![Página do Struct Launcher](docs/launcher-page.png)

## Versões dos aplicativos — catálogo público

Home, catálogo, diálogo, biblioteca ilustrativa e páginas de produto compartilham
uma consulta a `openstruct-catalog/main/catalog.signed.json`. O leitor valida o
esquema v1, a assinatura Ed25519 do envelope e as assinaturas dos metadados dos
pacotes. Chaves públicas, IDs e repositórios autorizados ficam fixados em
`src/lib/catalog-trust.ts`; nenhum token ou chave privada vai para o navegador.

A seleção é por produto e canal `stable`, com ordenação SemVer e os assets próprios
de cada versão. Não usa a release `latest` do hub nem `launcher/latest.json` para os
aplicativos. O conteúdo técnico continua fixado na ref editorial, mesmo quando uma
nova versão para instalar é publicada; a página mostra essa diferença.

Há carregamento, data da consulta, indisponibilidade por produto e nova tentativa
limitada a três consultas por sessão, com intervalo mínimo de um minuto e respeito
a `Retry-After`. Sem polling automático. Depois de 15 minutos, o dado fica marcado
como desatualizado até uma nova consulta. Um erro preserva o último envelope válido
do produto, sempre identificado como desatualizado. O cache local e o snapshot
incluído no site passam novamente pela verificação criptográfica antes de liberar
links. O conteúdo editorial continua navegável sem rede.

`npm test` inclui o catálogo real assinado e casos de adulteração, versões distintas,
fonte não autorizada, falha parcial, cache e limites de consulta. Consulte
[o contrato e a manutenção](docs/CATALOGO-PUBLICO.md) para atualizar as fontes.

![Catálogo com versões e data da consulta por aplicativo](docs/catalogo-publico.png)

## Instalação dos aplicativos

O caminho principal em ConsoloStruct, MolaStruct e ArmaduraStruct é **Instalar pelo
Struct Launcher**. A página encaminha a `/launcher`; quem já instalou o gerenciador
pode abri-lo no computador e escolher o aplicativo na biblioteca. O site não tenta
abrir protocolos locais nem inicia downloads automaticamente.

O componente compartilhado `ProductInstallation` mantém **Instalação manual e
versões anteriores** recolhida por padrão. Ao abrir, apresenta somente os pacotes
do catálogo validado: versão, data, sistema, arquitetura, formato, tamanho e SHA-256,
com cópia do hash e links às notas e ao histórico oficial. Os mesmos arquivos ficam
disponíveis no celular para transferência ao computador de destino. A sugestão de
sistema é apenas visual; não cria suporte a uma plataforma ausente.

Sem pacote confirmado, a alternativa manual mantém acesso às releases oficiais,
incluindo o hub correto do ArmaduraStruct. Dados de contingência conservam o aviso
de desatualização da OSF-05. A cópia de hash informa sucesso ou falha; ela não verifica
os bytes do instalador. O usuário pode calcular o SHA-256 localmente, enquanto o
Launcher faz a verificação do pacote durante a instalação.

A OSF-06 segue o escopo aprovado de priorizar o Launcher e manter a instalação
manual em segundo plano. `tests/installation.test.mjs` protege a apresentação dos
pacotes reais, dispositivos sem sugestão, alvos ausentes, troca de release e cópia
do checksum. A infraestrutura de publicação e os motores dos apps não mudaram.

![Launcher como caminho principal e alternativa manual recolhida](docs/instalacao-launcher.png)

## Links e integrações opcionais

Copie `.env.example` para `.env.local` e preencha os endereços que estiverem disponíveis:

```dotenv
VITE_CONSOLOSTRUCT_URL=https://seu-aplicativo.example
VITE_MOLASTRUCT_URL=https://seu-molastruct.example
VITE_DISCORD_URL=https://discord.gg/seu-convite
```

Os valores são incorporados durante o build. O botão “Baixar Launcher” abre a página de
downloads; a central “Abrir aplicativos” continua disponível no rodapé com acesso às páginas
e prévias. Os repositórios de ConsoloStruct e MolaStruct e os lançamentos do MolaStruct já têm
endereços oficiais por padrão. O Discord exibe um aviso de preparação e oferece o GitHub como
alternativa enquanto o convite não for configurado.

Os links gerais e as integrações opcionais ficam em `src/lib/config.ts`. Os dados
oficiais dos produtos ficam em `src/lib/apps.ts`, com tipos e validação em
`src/lib/app-registry.ts`. As antigas variáveis `VITE_*_REPOSITORY` não sobrescrevem
mais os repositórios oficiais. As antigas `VITE_*_DOWNLOAD_URL` também deixaram de
ser usadas: os pacotes oficiais devem passar pelo catálogo assinado.

## Registro editorial dos produtos

Os seis itens do catálogo usam uma fonte tipada e validada, incluindo os dois
produtos em planejamento. Versão de código, versão distribuída, maturidade,
plataformas e proveniência são campos independentes. Home, catálogo, diálogo e
páginas de produto compartilham identidade e rótulo de disponibilidade.

Consulte [como atualizar um produto e reconciliar README, tag e catálogo](docs/CATALOGO-EDITORIAL.md).
O registro é uma revisão editorial estática; ainda não sincroniza automaticamente
as releases dos aplicativos. O feed do próprio Launcher continua dinâmico.

## Prévia do ConsoloStruct

A página também apresenta quatro capturas reais da interface **0.7.1**, motor
**0.4.0**, executada no navegador a partir da tag publicada: entradas/modelo 3D,
memória calculada, vistas de detalhamento e quadro de aço. Cada figura informa
versão, legenda e acesso ao arquivo original para ampliação. A captura principal
oferece uma alternativa estática à prévia SVG, que continua identificada como
esquemática e sem cálculo.

As imagens usam o exemplo público fictício `consolos-detalhados.lume.json`, C01,
sem alterar os dados. O manifesto tipado `src/lib/consolo-media.ts` registra
origem, commit, exemplo, licença, ambiente, recortes, dimensões e hashes. Consulte
[Capturas do ConsoloStruct — OSF-08](docs/CONSOLOSTRUCT-CAPTURAS.md) para reproduzir
e atualizar o conjunto. A galeria tem versão própria; o escopo técnico revisado
abaixo continua sendo o da **0.6.0**, e a disponibilidade vem do catálogo assinado.

A demonstração é uma representação esquemática em SVG. Permite alternar entre modelo, armadura e detalhe, ajustar a projeção de 25 a 60 cm, separar camadas e restaurar o exemplo. **Não executa cálculo, dimensionamento, verificação normativa ou geração de desenho para obra.** A página separa essa prévia do aplicativo desktop publicado.

A apresentação do ConsoloStruct descreve o aplicativo **0.6.0**, com motor **0.3.0**,
política **LC-ELU-2026.1**, conforme os documentos da tag distribuída. Inclui recursos,
fluxo de uso, arquivos, limites e links para instalação pelo Launcher e documentação
oficial. As duas versões são identificações independentes; atendimento às verificações
implementadas não equivale a aprovação executiva.

O [mapa de fontes da apresentação](docs/CONSOLOSTRUCT-PUBLICADO.md) registra a origem
de cada grupo de afirmações e distingue as saídas de geometria das de detalhamento.

## MolaStruct

A página do MolaStruct descreve o aplicativo distribuído **0.5.1**, com geometria,
SPT/camadas, sapatas retangulares e blocos sobre 1 a 4 estacas. Apresenta a matriz
6×6 com acoplamentos, a resposta às ações e a capacidade em contextos separados,
além de memória, exportações e conferência parcial NBR 6122:2022.

Winkler, Mindlin/Aoki–Lopes/Steinbrenner, Randolph–Wroth simplificado,
disco equivalente, kv/SAFE e correlações opcionais SPT → E têm hipóteses e fontes
fixadas na tag. Aoki–Velloso trata capacidade de estaca isolada; Vésic e a referência
exploratória SPT têm seus limites descritos. **Terzaghi permanece pendente**.

O código revisado da master está em **0.7.0**. A seleção CRH/TQS das revisões
posteriores e as sapatas FEMA/Teixeira–Godoy aparecem em seção separada, fora do
instalador 0.5.1. A prévia SVG do site não executa o motor nem representa a
interface real. Não há alegação de equivalência integral com TQS ou aprovação
normativa global. Consulte o [mapa de evidências](docs/MOLASTRUCT-PUBLICADO.md)
antes de atualizar as afirmações junto com uma nova distribuição.

O componente `FoundationPreview` permite alternar entre sapata e bloco, com 1, 2, 3 ou 4 estacas. **É um esquema conceitual de apresentação, sem cálculo de rigidez, recalque ou capacidade de carga.** Os detalhes técnicos e a integração com o aplicativo serão acrescentados posteriormente.

## ArmaduraStruct

A página descreve a release distribuída **0.2.0**, tag `v0.2.0`. A captura exibida
é o mesmo `docs/preview.png` dessa tag: mostra as abas Projeto/Propriedades e os
recursos disponíveis, sem hierarquia ou gerenciador de pranchas posterior.

A home destaca o aplicativo com essa captura real e com o fluxo importar máscara
→ detalhar → conferir o quadro de aço → salvar/exportar. A captura e os recursos
apresentados têm versão própria, independente da versão para instalar consultada
no catálogo assinado. O acesso principal continua pelo Struct Launcher. A origem,
o compromisso editorial e a manutenção da imagem estão registrados em
[Destaque do ArmaduraStruct — OSF-07](docs/ARMADURASTRUCT-DESTAQUE.md).

O fluxo público é importar uma máscara DXF ASCII ou DWG, detalhar, conferir os
quantitativos e exportar. DWG é somente entrada, com compatibilidade limitada às
entidades reconhecidas; a saída CAD é DXF. O arquivo editável `.armstruct.json`
usa `armadurastruct/2`, enquanto PDF A3 e CSV completam as saídas documentais.
As unidades e o caráter manual do traspasse e das verificações de projeto ficam
visíveis junto ao quadro de entradas e saídas.

A master consultada continua com package 0.2.0, mas documenta hierarquia,
detalhamentos compostos, pranchas, folhas/vistas e o formato `armadurastruct/5`.
Esses recursos aparecem apenas como desenvolvimento, fora do instalador público.
O aplicativo usa **GPL-3.0-or-later**, independentemente da licença deste frontend
e dos demais projetos. O [mapa de evidências](docs/ARMADURASTRUCT-PUBLICADO.md)
fixa as afirmações à tag e registra as diferenças da master.

## Identidade visual

| Cor           | Código    | Uso                      |
| ------------- | --------- | ------------------------ |
| Cobalto       | `#3448D1` | Marca e ações principais |
| Laranja solar | `#FF8A3D` | ConsoloStruct            |
| Âmbar         | `#F4C95D` | Destaques                |
| Aço           | `#B8C5D6` | Apoio                    |
| Grafite       | `#18212F` | Texto e tema escuro      |
| Marfim        | `#F4F1E9` | Fundo principal          |

Tipografia: Sora para marca e títulos, Inter para interface e leitura, IBM Plex Mono para informações técnicas. O monograma O tem uma versão vetorial em `public/assets/openstruct-mark.svg`. As ilustrações originais de Atlas (ConsoloStruct) e da Terra sustentando uma mola e uma fundação (MolaStruct) foram criadas para este projeto com geração de imagem. O ícone do MolaStruct está em `public/assets/molastruct-gaia.webp`.

As fontes WOFF2 são subconjuntos para idiomas latinos. Seus avisos SIL Open Font License estão em `public/fonts/`. A geometria do monograma está em `src/components/Brand.tsx`; o desenho esquemático em `src/components/CorbelModel.tsx`.

## Publicação

O build estático é gerado em `dist/`. Há configurações para Vercel, Netlify e serviços que aceitam `_redirects`. Em outro servidor, configure o fallback das rotas do React Router para `index.html`:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

A publicação e a configuração do domínio `openstruct.com.br` são independentes do envio do código ao GitHub.

## Política de segurança de conteúdo (CSP)

A CSP é enviada como cabeçalho HTTP em todas as rotas e arquivos estáticos pelo
`vercel.json`, com configuração equivalente no `netlify.toml`. Permite scripts,
estilos e fontes locais, os avatares públicos do GitHub e conexões de dados para
`raw.githubusercontent.com`; `frame-ancestors 'self'` restringe a incorporação do
site a páginas da mesma origem. O tema é inicializado por `public/theme-init.js`,
síncrono no `<head>`, sem scripts ou estilos inline.

Ao acrescentar uma origem externa (inclusive trocar o host do catálogo, snapshot
ou feed do Launcher), revise a diretiva correspondente nas duas configurações.
Teste primeiro com `Content-Security-Policy-Report-Only`, verifique todas as rotas
e interações no navegador e só depois promova para `Content-Security-Policy`,
sem liberar `unsafe-inline` ou `unsafe-eval`. O servidor de desenvolvimento e
`vite preview` não aplicam automaticamente os cabeçalhos de hospedagem. Veja o
[registro de validação e as verificações após o deploy](docs/CSP.md).

Os demais cabeçalhos HTTP de segurança são definidos em `vercel.json` (Vercel) e `netlify.toml` (Netlify).

## Estrutura

```text
src/
  components/  # Marca, layout, cartões, central de aplicativos e demonstração
  lib/         # Configuração central e catálogo
  pages/       # Páginas e navegação
  styles.css   # Identidade, temas e layouts responsivos
public/
  assets/      # Ilustrações dos aplicativos e monograma
  fonts/       # Fontes locais e licenças
```

O tema é persistido no navegador, com preferência clara na primeira visita. A interface inclui links de salto, foco visível, menu móvel, controles com rótulos e respeito a movimento reduzido. A central de aplicativos usa um diálogo nativo com navegação por teclado.

## Contribuição

Siga o **[manual de colaboração passo a passo](https://www.openstruct.com.br/community/como-colaborar)**.
Ele explica como escolher o repositório, colaborar sem programar ou preparar uma pequena
alteração no frontend e acompanhar sua revisão. Os aplicativos mantêm seus próprios guias.
O ambiente do site está em [Desenvolvimento](#desenvolvimento); o percurso completo,
comandos e checklists são mantidos no manual, evitando cópias divergentes.
Veja [fontes, dependências e manutenção do manual](docs/MANUAL-COLABORACAO.md).

Para trabalhar com uma IA, siga o **[roteiro de contribuição com ChatGPT/Codex, Claude e Gemini](https://www.openstruct.com.br/development/contribuir-com-ia)**.
O guia tem seis passos e um prompt copiável, personalizado com o projeto, o fork e a issue.
O ambiente escolhido também orienta o prompt: ChatGPT Work/Codex, Claude Code ou
Antigravity com Gemini (com alternativa Gemini CLI). Exemplos ajudam a julgar a tarefa:
modelos menores para ajustes simples e GPT-6.1 Sol com raciocínio Máximo para trabalho complexo,
quando disponível. Modelo, esforço e permissões são configurados na própria ferramenta.
O fluxo sincroniza o fork antes da implementação, pede testes e envia a alteração para uma
branch do colaborador; a abertura do PR é manual. Há atalhos na home, em Desenvolvimento,
no manual geral e no rodapé. [Manutenção e fontes do guia](docs/CONTRIBUICAO-IA.md).

Licença MIT. As fontes mantêm suas próprias licenças OFL.

### Capturas do MolaStruct

A página reutiliza a galeria acessível da OSF-10 com três imagens oficiais das
docs da tag 0.5.1. As telas preservam rótulos históricos v0.1/v0.2/v0.5, indicados
individualmente, sem fingir que foram capturadas na versão do instalador.
[Origem, licença e limites das capturas](docs/MOLASTRUCT-CAPTURAS.md).

### Filtros compartilháveis do catálogo

A seleção em `/apps` é persistida na URL: busca sem acentos, categoria,
disponibilidade, plataforma e horizonte futuro. Copiar link compartilha os filtros;
o histórico restaura a seleção. Planejamento não recebe pacote ou plataforma.
[Contrato e comportamento dos filtros](docs/FILTROS-CATALOGO.md).

## Dados públicos do GitHub

Os [créditos da Comunidade](https://www.openstruct.com.br/community#contribuidores)
reúnem logins públicos, sem ranking; veja [critérios de atribuição](docs/CONTRIBUIDORES.md).
O [histórico de releases](https://www.openstruct.com.br/releases) separa aplicativos
e Launcher, com notas e canais das fontes oficiais; veja [contrato e limites](docs/RELEASES-PUBLICAS.md).

O **[roadmap público](https://www.openstruct.com.br/development#roadmap)** combina
milestones reais com trechos revisados de documentos públicos, separando planejamento
e instalação. Veja [fontes, regras de estado e atualização](docs/ROADMAP-PUBLICO.md).

A Comunidade tem a seção **Para começar**, com issues abertas selecionadas por
labels configuradas em cada repositório e caminhos reais de documentação, exemplos
e revisão visual quando não há oportunidades. Veja [critérios, fontes e manutenção](docs/PRIMEIRAS-CONTRIBUICOES.md).

A página de comunidade lê um snapshot público de atividade, sem token no navegador.
A coleta por Actions confirma a visibilidade dos seis repositórios autorizados, normaliza os dados,
usa ETag e limites de paginação, e publica JSON validado na branch `github-data`,
acompanhado de uma configuração fixa que impede deploys dessa branch na Vercel.
Leitura e escrita usam jobs com permissões separadas. O catálogo assinado de downloads permanece independente.

Consulte [contrato, limites, cache e manutenção](docs/GITHUB-PUBLICO.md) e o
[diagnóstico de atualização da issue #2](docs/DIAGNOSTICO-ATUALIZACAO-GITHUB.md).

## Central de desenvolvimento

A rota `/development` reúne os seis repositórios públicos, com seleção por repositório na URL, contagens de itens únicos no recorte de issues/PRs, releases estáveis e datas por fonte. Falhas e dados antigos são identificados sem esconder a navegação. As versões de instalação continuam vindo do catálogo assinado, separadas das publicações do código.

Veja [cobertura, contrato v2 e validação](docs/CENTRAL-DESENVOLVIMENTO.md).

A seção `/development#openstruct-issue` disponibiliza a OpenStruct Issue v2.0.0, com download local do ZIP, instalação por agente, prompts copiáveis e dicas para preparar issues. Veja [diagnóstico, conteúdo final, implementação e validação](docs/OPENSTRUCT-ISSUE.md).

## Issues com filtros e paginação

A central `/development#issues` permite filtrar issues por repositório, estado e labels reais, buscar no recorte carregado e navegar em páginas de dez itens. A URL preserva a seleção, com histórico voltar/avançar. As contagens distinguem o recorte do total do repositório e excluem PRs; o snapshot v3 conserva abertas/fechadas e sua cobertura separadamente.

Veja [contrato, filtros e validação da OSF-19](docs/ISSUES-CENTRAL.md).

## Auditoria de links e atualização editorial

Execute `npm run audit:content` para rotas, âncoras, artigos e mídia local. A CI executa
essa checagem e guarda o relatório. `npm run audit:external` acrescenta sondagens externas
e alertas de versão; também roda diariamente em uma Action separada, sem bloquear o deploy
por quota/timeout e sem abrir issues. Veja [cobertura, relatórios e manutenção](docs/AUDITORIA-CONTEUDO.md).

### Painel StructBot

A rota `/structbot` reúne boletins, atividade, issues, PRs e frentes de trabalho da API pública. A integração já está configurada para Vercel, Netlify e desenvolvimento local, sem tokens no frontend. Consulte [o contrato de integração e operação do painel](docs/STRUCTBOT.md).
