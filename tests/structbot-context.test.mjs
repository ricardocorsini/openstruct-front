import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { isConversation, isNewspaper } from '../src/lib/structbot-context.ts';
import { isReport } from '../src/lib/structbot.ts';
const fixture = JSON.parse(
  await fs.readFile(new URL('./fixtures/structbot-context.json', import.meta.url), 'utf8'),
);

test('published v2 contracts retain distinct roles, offers, sources and editorial references', () => {
  assert.equal(isConversation(fixture.conversation), true);
  assert.equal(isReport(fixture.report), true);
  assert.equal(isNewspaper(fixture.report.content.news), true);
  assert.equal(
    fixture.conversation.analysis.content.participants.find((p) => p.login === 'carlos').state,
    'offered',
  );
  const invalid = structuredClone(fixture.conversation);
  delete invalid.analysis.sources['issue_comment:1'];
  assert.equal(isConversation(invalid), false);
  invalid.analysis.sources = fixture.conversation.analysis.sources;
  invalid.analysis.content.participants[0].evidence = {};
  assert.equal(isConversation(invalid), false);
  const brokenNews = structuredClone(fixture.report);
  brokenNews.content.news.stories[0].contributors = { login: 'unknown' };
  assert.equal(isReport(brokenNews), false);
});
test('old editions and pending conversation states remain readable during a staged upgrade', () => {
  const previous = structuredClone(fixture.report);
  delete previous.content.news;
  assert.equal(isReport(previous), true);
  assert.equal(
    isConversation({ ...fixture.conversation, analysis: null, analysis_state: 'pending' }),
    true,
  );
  assert.equal(isConversation({ ...fixture.conversation, analysis: null, collection: {} }), false);
});
test('rendered journal and conversation preserve uncertainty, attribution and escaped remote text', async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  try {
    const { NewsPanel } = await server.ssrLoadModule('/src/components/structbot/NewsPanel.tsx');
    const { ConversationCard } = await server.ssrLoadModule(
      '/src/components/structbot/ConversationsPanel.tsx',
    );
    const sample = structuredClone(fixture.conversation);
    sample.analysis.content.summary = '<img src=x onerror=alert(1)> & <script>fake</script>';
    sample.analysis.sources['issue_comment:1'].url = 'javascript:alert(1)';
    sample.analysis.stale = true;
    const card = renderToStaticMarkup(createElement(ConversationCard, { item: sample }));
    assert.match(card, /Ajuda oferecida/);
    assert.match(card, /Interpretação provável/);
    assert.match(card, /Atribuição no GitHub:.*sem responsável atribuído/);
    assert.match(card, /&lt;img/);
    assert.doesNotMatch(card, /<script|<img|href="javascript:/);
    assert.match(card, /fontes alteradas, antigas ou incompletas/);
    const newspaper = renderToStaticMarkup(
      createElement(NewsPanel, { report: { data: fixture.report, loading: false, error: null } }),
    );
    assert.match(newspaper, /Últimas notícias do OpenStruct/);
    assert.match(newspaper, /Uma contribuição avança/);
    assert.match(newspaper, /@ana/);
    assert.match(newspaper, /github.com\/example\/project\/issues\/1/);
    const pending = renderToStaticMarkup(
      createElement(ConversationCard, {
        item: { ...sample, analysis: null, analysis_state: 'collection_incomplete' },
      }),
    );
    assert.match(pending, /coleta dos comentários precisa ser concluída/);
    assert.doesNotMatch(pending, /Ajuda oferecida/);
  } finally {
    await server.close();
  }
});
