import { developmentSources } from './development.ts';
import { contributionPolicies } from './contributions.ts';

export const CONTRIBUTION_MANUAL_PATH = '/community/como-colaborar';
export const manualReview = {
  date: '2026-11-07',
  frontendRef: '83ad34fb4681c0817efc3d6a84f81bf0ad0150d5',
  frontendBranch: 'master',
  sources: {
    'itanervale/GEOSPT-STRUCT': '5f5cded75e94dbce2bea90eb685deef74d1dfd1f',
    'ricardocorsini/openstruct-front': '83ad34fb4681c0817efc3d6a84f81bf0ad0150d5',
    'ricardocorsini/consolo-struct': '54abc400ae43a5a3bdf025df85c327dde1ad5086',
    'ricardocorsini/mola-struct': 'aeda58309ddadcd53cac16aa1625473391d8efad',
    'ricardocorsini/armadura-struct': '8e7dcd726a37ba801c5a1d5fbe89342ebcb67ad5',
    'ricardocorsini/geo-struct': '6fe17367ba9bf85d8ddccc42cbba23631ae58253',
    'ricardocorsini/openstruct-catalog': 'a527a902cb35299c334e01564e83e798cd64c048',
  },
};
export const manualSections = [
  { id: 'escolher', title: '1. Escolha o projeto e sua forma de ajudar' },
  { id: 'sem-codigo', title: '2. Sua primeira colaboração sem código' },
  { id: 'codigo', title: '3. Sua primeira alteração no frontend' },
  { id: 'antes-de-enviar', title: '4. Confira antes de enviar' },
  { id: 'duvidas', title: '5. Dúvidas e próximos passos' },
  { id: 'fontes', title: '6. Fontes e revisão deste manual' },
] as const;
export const contributionPaths = [
  {
    id: 'problema',
    title: 'Relatar um problema',
    prerequisites: 'Acesso à tela ou ao aplicativo em que aconteceu; anote a versão.',
    next: 'Pesquise relatos existentes e siga o percurso sem código.',
    example: 'Exemplo fictício: um botão fica inacessível em uma janela estreita.',
    result: 'Um relato com passos e esperado versus obtido.',
    target: 'sem-codigo',
  },
  {
    id: 'melhoria',
    title: 'Sugerir uma melhoria',
    prerequisites: 'Um caso de uso e a necessidade que você quer resolver.',
    next: 'Confira se a ideia já foi discutida e explique o problema antes de sugerir a solução.',
    example: 'Exemplo fictício: orientar a unidade de um campo antes do preenchimento.',
    result: 'Uma proposta discutível, sem promessa de implementação.',
    target: 'sem-codigo',
  },
  {
    id: 'documentacao',
    title: 'Revisar documentação',
    prerequisites:
      'Ler a instrução e identificar a página ou o arquivo. Git não é obrigatório para apontar um trecho confuso.',
    next: 'Abra o guia do projeto escolhido e descreva a redação atual e a sugestão.',
    example: 'Exemplo fictício: uma etapa não explica em qual menu está o comando.',
    result: 'Uma sugestão localizada, com texto antes e depois.',
    target: 'sem-codigo',
  },
  {
    id: 'exemplos',
    title: 'Testar exemplos públicos',
    prerequisites: 'O ambiente e a versão indicados no guia do próprio aplicativo.',
    next: 'Reproduza um exemplo autorizado e registre entradas, unidades, passos e saídas.',
    example:
      'Abra um exemplo público e compare o comportamento com o que sua documentação descreve.',
    result: 'Uma reprodução rastreável; isso não aprova um projeto de engenharia.',
    target: 'sem-codigo',
  },
  {
    id: 'interface',
    title: 'Ajudar com interface e acessibilidade',
    prerequisites: 'Navegador, teclado e uma situação que você possa descrever.',
    next: 'Confira Tab, Shift+Tab, Enter, foco visível, tema e largura da janela.',
    example:
      'Exemplo fictício: um link recebe foco, mas seu contorno não pode ser visto no tema escuro.',
    result: 'Uma observação com URL, contexto e evidência pública ou fictícia.',
    target: 'sem-codigo',
  },
  {
    id: 'programacao',
    title: 'Contribuir com código',
    prerequisites: 'Para o site: Git, Node.js 24 LTS, npm e uma conta GitHub para enviar o PR.',
    next: 'Siga o percurso do frontend; para aplicativos, use o guia do repositório escolhido.',
    example: 'Uma correção pequena de texto, link ou comportamento da interface.',
    result: 'Uma alteração revisável, acompanhada das verificações executadas.',
    target: 'codigo',
  },
] as const;
export function manualRepository(slug: string | null) {
  const source = developmentSources.find((s) => s.slug === slug);
  if (!source) return undefined;
  const policy = contributionPolicies[source.repository];
  const chooser = ['ricardocorsini/consolo-struct', 'ricardocorsini/mola-struct'].includes(
    source.repository,
  );
  return {
    source,
    guide: policy.guide,
    documentation: policy.documentation,
    examples: policy.examples,
    issues: source.url + '/issues?q=is%3Aissue',
    newIssue: source.url + (chooser ? '/issues/new/choose' : '/issues/new'),
    reviewedRef: manualReview.sources[source.repository],
  };
}
export const frontendManualSource = manualRepository('openstruct-front')!;
const upstream = frontendManualSource.source.url;
export const frontendCommands = {
  versions: 'node --version\nnpm --version\ngit --version',
  clone: `git clone https://github.com/SEU-USUARIO/openstruct-front.git\ncd openstruct-front\ngit remote add upstream ${upstream}.git\ngit fetch upstream\ngit switch -c docs/primeira-contribuicao upstream/${manualReview.frontendBranch}`,
  install: 'npm ci\nnpm run dev',
  localDev: 'npm run dev -- --host 127.0.0.1',
  check: 'npm test\nnpm run build\ngit diff --check\ngit status --short\ngit diff -- README.md',
  send: 'git add -- README.md\ngit diff --cached\ngit commit -m "docs: esclarece uma orientação do site"\ngit push -u origin docs/primeira-contribuicao',
  update:
    'git add -- README.md\ngit diff --cached\ngit commit -m "docs: ajusta a orientação após revisão"\ngit push origin docs/primeira-contribuicao',
};
export const exampleReport = `EXEMPLO FICTÍCIO — não é um defeito confirmado
Produto: site OpenStruct
Página: /docs
Contexto: navegador e versão anotados, janela de 390 px, tema escuro
Passos: abrir /docs; usar Tab até o link de um artigo
Esperado: identificar visualmente qual link está com foco
Obtido neste exemplo hipotético: o foco não fica visível
Frequência: anotar se acontece sempre ou só em certas condições
Evidência: descrição textual ou captura feita apenas com dados fictícios
Versão/data: informar versão do app ou data da visita ao site; commit se conhecido`;
