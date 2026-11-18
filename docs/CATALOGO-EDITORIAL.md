# Registro editorial dos aplicativos

`src/lib/apps.ts` reúne o registro editorial dos produtos apresentados no site. Seus dados foram revisados a partir dos
repositórios **públicos**, tags e catálogo de distribuição indicados em cada entrada.
O registro não contém conteúdo do repositório privado do Launcher.
Em 12/11/2026, foram incluídas as propostas AnchorStruct e SlopeStruct. Com a
inclusão do GeoStruct em 18/11/2026, o catálogo contém cinco produtos atuais e
duas propostas planejadas.

`src/lib/config.ts` guarda somente configuração do site e integrações opcionais de
implantação. Os tipos, a validação e os rótulos derivados ficam em
`src/lib/app-registry.ts`. Home, catálogo, diálogo, biblioteca ilustrativa do Launcher,
rodapé e páginas dos produtos consomem esse mesmo registro. A OSF-05 acrescenta a
consulta compartilhada ao [catálogo público assinado](CATALOGO-PUBLICO.md) para
versões de instalação e disponibilidade; ela não reescreve o conteúdo técnico.

## Campos e significados

| Campo                                         | Significado                                                                                                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `name`, `category`, `description`       | Identidade e resumo editorial do produto. O `id` é único e preserva a URL pública.                                                                                         |
| `stage`                                       | `current` para um produto com fonte pública identificada; `planned` para uma ideia do catálogo.                                                                            |
| `maturity`                                    | Estado do desenvolvimento/engenharia: `development`, `experimental`, `stable` ou `planned`. Não é derivado do canal de publicação.                                         |
| `planningStatus`                              | Opcional e exclusivo de planejamento: `not-started` produz o rótulo “A iniciar”. Sem esse campo, permanece “Em planejamento”. |
| `page`                                        | Página informativa opcional de uma proposta com desenvolvimento não iniciado: `route`, `image` e `imageAlt`. Não cria repositório ou distribuição. |
| `route`, `previewAnchor`, `image`, `imageAlt` | Endereço público e apresentação já existentes no frontend.                                                                                                                 |
| `repository`                                  | URL oficial pública, branch padrão e visibilidade conferida durante a revisão.                                                                                             |
| `code`                                        | Versão de `package.json`, **commit exato** e URL desse arquivo na revisão consultada. Não determina a versão disponível para instalar.                                     |
| `distribution`                                | Versão efetivamente distribuída, tag/commit de origem, canal, data, release pública e pacotes por plataforma. Pode estar ausente em um produto atual ainda sem publicação. |
| `documentation`, `license`                    | Fontes fixadas por tag/commit. A licença contém o identificador SPDX declarado pelo produto, ou `null` quando o repositório ainda não informa uma licença.                 |
| `editorial.reviewedAt`                        | Data da revisão humana/editorial dos dados; não muda automaticamente no build.                                                                                             |
| `editorial.sources`                           | URLs e refs imutáveis do texto-base, distribuição ou planejamento.                                                                                                         |

`getAppStatus` conserva o rótulo derivado da revisão local para validação do registro.
Na interface, `AppStatus` usa a consulta pública compartilhada, incluindo estados
indisponível, desconhecido e desatualizado. O canal `stable` de um pacote **não**
torna o motor de engenharia validado nem altera `maturity`.

Na revisão inicial:

| Produto        | Versão do código consultado | Versão distribuída | Maturidade         | Pacotes confirmados  |
| -------------- | --------------------------- | ------------------ | ------------------ | -------------------- |
| ConsoloStruct  | 0.6.0                       | 0.6.0              | Em desenvolvimento | Windows/Linux x86_64 |
| MolaStruct     | 0.7.0                       | 0.5.1              | Experimental       | Windows/Linux x86_64 |
| ArmaduraStruct | 0.2.0                       | 0.2.0              | Em desenvolvimento | Windows/Linux x86_64 |

O commit do código do ArmaduraStruct é posterior ao commit da tag, mesmo com a mesma
versão em `package.json`. Por isso o registro mantém os dois commits. VigasStruct,
PilarStruct, SapataStruct e 3DStruct foram retirados do registro por decisão do
mantenedor e não são apresentados no horizonte futuro.

AnchorStruct (chumbadores) e SlopeStruct (taludes e contenções) usam
`planningStatus: 'not-started'`. Sua apresentação mínima vem de `page`, separada
dos campos de produto atual. `getAppPage` resolve a apresentação dos dois tipos
para os cards e títulos; `getPlannedApp` resolve apenas propostas com página.
Os cards usam a arte local neutra “Em breve”, mantendo contraste de texto e ações
nos dois temas. As propostas continuam fora do diálogo de aplicativos e de qualquer
oferta de instalação. [Decisões e atualização das artes](PRODUTOS-PLANEJADOS.md).

O campo opcional `engine` registra versão, política e documento de critérios do motor
na ref da distribuição. Ele é independente de `code.version` e `distribution.version`.
Quando presente, sua fonte precisa pertencer à versão distribuída.

## Atualizar um produto

1. Confirme a visibilidade pública do repositório e sua branch padrão. Registre o
   commit consultado antes de ler `package.json`, README e licença. Nunca exporte
   conteúdo privado, tokens ou informações internas.
2. Consulte o catálogo público de distribuição do OpenStruct e identifique o produto
   pelo `id`. Consulte também a release correspondente e seus arquivos. O hub contém
   versões de produtos diferentes; sua release `latest` não é a versão de todos eles.
3. Confira a tag e resolva seu **commit**. Registre os dois em `distribution`. Copie
   somente URLs dos pacotes publicados, com sistema, arquitetura e formato reais.
   Não deduza suporte a macOS/ARM a partir da existência de código Tauri.
4. Leia o README e a documentação **na ref da versão distribuída**. Se a branch já
   tiver recursos novos, eles não podem ser anunciados como parte do instalador
   antigo. Uma versão igual em `package.json` também não prova igualdade do código.
5. Para disponibilidade e assets, prevalece a publicação efetiva. Um README antigo
   dizendo “aguarda publicação” deve ser reconciliado com a release e o catálogo;
   isso não autoriza importar funcionalidades de um README mais novo.
6. Atualize os campos e as evidências em `apps.ts`, inclusive a data de revisão. Para
   URLs de documentação/licença/texto-base, prefira o commit imutável da release.
   Mantenha o resumo dentro do escopo confirmado, as rotas públicas e a marca.
7. Rode `npm test` e `npm run build`. Confira nomes e status na home, catálogo e
   diálogo, além dos links nas páginas de produto, em mobile/desktop e ambos os temas.

O guia de atualização não exige mudar os motores dos aplicativos. Novas releases
atualizam a oferta de instalação pela consulta assinada; a revisão dos recursos,
guias e fontes técnicas continua sendo uma etapa editorial explícita.

## Validação

`validateAppRegistry` roda ao importar o registro, inclusive nos testes da CI. Rejeita:

- IDs duplicados, campos obrigatórios ausentes e campos de produto atual em planejamento;
- estados de planejamento desconhecidos e páginas informativas com rota, arte ou texto alternativo inválidos;
- fontes sem ref fixa, URL/ref divergentes e datas de revisão inválidas;
- repositórios não declarados públicos e fontes fora do repositório do produto;
- descrição/documentação de outra revisão que a da versão distribuída;
- pacotes sem plataforma, duplicados ou com produto, versão, origem e formato trocados.

A declaração `visibility: 'public'` deve ser conferida durante a revisão: o validador
local não consulta permissões do GitHub. Ele verifica estrutura e coerência dos dados;
não consulta existência de arquivos nem verifica assinatura criptográfica de um
instalador. O Launcher continua responsável por sua própria verificação de pacotes.

## Integrações de implantação

`VITE_CONSOLOSTRUCT_URL` e `VITE_MOLASTRUCT_URL` continuam opcionais para abrir uma
instância web configurada. As antigas `VITE_*_DOWNLOAD_URL` são ignoradas: um endereço
de implantação não pode liberar um instalador fora da validação do catálogo.
As integrações web não mudam versão, maturidade, disponibilidade ou proveniência oficiais.

As antigas `VITE_CONSOLOSTRUCT_REPOSITORY` e `VITE_MOLASTRUCT_REPOSITORY` deixam de
sobrescrever a identidade oficial. Para um fork com outros produtos, revise o registro
com suas próprias fontes públicas. Um override de implantação não deve ser anunciado
como o repositório oficial de um produto diferente.

O download do próprio Struct Launcher permanece independente, em
`src/lib/launcher.ts`, usando seu feed público e as validações já existentes.
