import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  availableActions,
  ContributorError,
  isTask,
  isTaskPage,
  isSession,
  LOGIN_URL,
  logout,
  readSession,
  sendTaskAction,
} from '../src/lib/structbot-tasks.ts';

const user = {
  id: 10,
  login: 'alice',
  avatar_url: 'https://avatars.githubusercontent.com/u/10?s=64',
};
const session = { enabled: true, user, csrf_token: 'c'.repeat(43), maintainer_repositories: [] };
const task = {
  key: 'example/project#1',
  repository: 'example/project',
  system: 'Example',
  number: 1,
  title: 'Tarefa pública',
  url: 'https://github.com/example/project/issues/1',
  kind: 'issue',
  github_state: 'open',
  github_assignees: [],
  author: 'author',
  draft: false,
  ci_summary: null,
  status: 'available',
  status_source: null,
  owner: null,
  role: 'implementation',
  version: 0,
  priority: {
    level: 'unassessed',
    rationale: 'Aguardando avaliação atualizada da IA.',
    origin: null,
    stale: false,
  },
  delivery: null,
  related: [],
  updated_at: '2026-11-14T10:00:00Z',
  observed_at: '2026-11-14T10:00:00Z',
  source_stale: false,
  reservation_stale: false,
  completion_source: null,
};
const maintained = { ...session, maintainer_repositories: ['example/project'] };

test('task contract preserves unknown priority, author versus reviewer and GitHub closure semantics', () => {
  assert.equal(isTask(task), true);
  assert.equal(
    isTaskPage({
      items: [task],
      total: 1,
      generated_at: task.updated_at,
      refresh_requested: false,
    }),
    true,
  );
  assert.equal(isTask({ ...task, priority: { ...task.priority, level: 'urgent' } }), false);
  assert.equal(isTask({ ...task, version: -1 }), false);
  assert.equal(isTask({ ...task, owner: { login: 'spoofed' } }), false);
  assert.equal(isSession(session), true);
  assert.equal(isSession({ ...session, csrf_token: null }), false);
  assert.equal(
    isSession({ enabled: false, user: null, csrf_token: null, maintainer_repositories: [] }),
    true,
  );
});
test('actions require login, ownership, current sources and a separate PR reviewer', () => {
  assert.deepEqual(availableActions(task, null), []);
  assert.deepEqual(availableActions(task, { ...session, enabled: false }), []);
  assert.deepEqual(availableActions(task, session), ['claim']);
  assert.deepEqual(availableActions({ ...task, source_stale: true }, session), []);
  assert.deepEqual(availableActions({ ...task, github_assignees: ['bob'] }, session), []);
  assert.deepEqual(availableActions({ ...task, github_assignees: ['ALICE'] }, session), ['claim']);
  const claimed = { ...task, owner: user, status: 'in_progress', version: 1 };
  assert.deepEqual(availableActions(claimed, session), ['submit', 'block', 'release']);
  assert.deepEqual(
    availableActions(claimed, { ...session, user: { ...user, id: 11, login: 'bob' } }),
    [],
  );
  const pr = { ...task, kind: 'pull_request', role: 'review', status: 'in_review' };
  assert.deepEqual(availableActions({ ...pr, author: 'alice' }, session), []);
  assert.deepEqual(availableActions(pr, session), ['claim']);
  assert.equal(
    availableActions({ ...task, github_state: 'closed', status: 'closed' }, maintained).includes(
      'complete',
    ),
    false,
  );
  assert.deepEqual(availableActions({ ...claimed, status: 'in_review' }, maintained), [
    'block',
    'release',
    'request_changes',
    'complete',
    'reassign',
    'priority',
  ]);
});
test('contributor session is requested directly from the fixed API with credentials and no cache', async () => {
  let captured;
  const result = await readSession(new AbortController().signal, async (url, options) => {
    captured = { url, options };
    return Response.json(session);
  });
  assert.equal(result.user.login, 'alice');
  assert.equal(captured.url, 'https://api.openstruct.com.br/api/v1/auth/session');
  assert.equal(captured.options.credentials, 'include');
  assert.equal(captured.options.cache, 'no-store');
  assert.equal(LOGIN_URL, 'https://api.openstruct.com.br/api/v1/auth/github/start');
});
test('mutations send optimistic version and CSRF, cannot spoof actor or choose another origin, and are never retried', async () => {
  let captured;
  const result = await sendTaskAction(task, session, 'claim', {}, async (url, options) => {
    captured = { url, options };
    return Response.json({ ...task, owner: user, status: 'in_progress', version: 1 });
  });
  assert.equal(result.owner.id, 10);
  assert.equal(
    captured.url,
    'https://api.openstruct.com.br/api/v1/tasks/example/project/1/actions',
  );
  assert.equal(captured.options.credentials, 'include');
  assert.equal(captured.options.headers['X-CSRF-Token'], session.csrf_token);
  assert.equal(captured.options.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(captured.options.body), { action: 'claim', expected_version: 0 });
  await assert.rejects(
    sendTaskAction({ ...task, repository: 'https://evil.example' }, session, 'claim', {}),
    /inválido/,
  );
  await assert.rejects(sendTaskAction(task, { ...session, user: null }, 'claim', {}), /Entre/);
  let attempts = 0;
  await assert.rejects(
    sendTaskAction(task, session, 'claim', {}, async () => {
      attempts++;
      return Response.json({ detail: 'A tarefa mudou' }, { status: 409 });
    }),
    (error) => error instanceof ContributorError && error.status === 409,
  );
  assert.equal(attempts, 1);
  await assert.rejects(
    sendTaskAction(task, session, 'claim', {}, async () => {
      throw new TypeError('offline');
    }),
  );
});
test('logout clears the server session through a CSRF protected request; invalid successes stay errors', async () => {
  await logout(session, async (url, options) => {
    assert.equal(url, 'https://api.openstruct.com.br/api/v1/auth/logout');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['X-CSRF-Token'], session.csrf_token);
    return new Response(null, { status: 204 });
  });
  await assert.rejects(
    sendTaskAction(task, session, 'claim', {}, async () => Response.json({})),
    /incompatível/,
  );
});
test('new center replaces the main inventory, keeps all filters empty and does not expose administrative credentials', async () => {
  const page = await readFile(new URL('../src/pages/StructBot.tsx', import.meta.url), 'utf8');
  assert.ok(page.indexOf('<TasksPanel') < page.indexOf('<ReportPanel'));
  assert.equal(page.includes('<InventoryPanel'), false);
  const component = await readFile(
    new URL('../src/components/structbot/TasksPanel.tsx', import.meta.url),
    'utf8',
  );
  assert.match(component, /repository: '',[\s\S]*kind: '',[\s\S]*status: ''/);
  assert.match(component, /<dialog/);
  assert.match(component, /Este registro será público/);
  assert.doesNotMatch(component, /ADMIN_TOKEN|OPENAI_API_KEY|GITHUB_TOKEN|localStorage/);
});
