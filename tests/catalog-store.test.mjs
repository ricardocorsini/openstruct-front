import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  verifySignedCatalog,
  CatalogRequestError,
  CatalogValidationError,
} from '../src/lib/catalog.ts';
import { SignatureVerificationUnavailableError } from '../src/lib/signatures.ts';
import { createCatalogStore, CATALOG_TTL_MS, availabilityLabel } from '../src/lib/catalog-store.ts';
import { CATALOG_IDS } from '../src/lib/catalog-trust.ts';

const envelope = JSON.parse(
  await readFile(new URL('./fixtures/catalog-2026-11-07.signed.json', import.meta.url), 'utf8'),
);
const catalog = await verifySignedCatalog(envelope);
const baseline = { envelope, checkedAt: '2026-11-07T10:48:13Z' };
const startTime = Date.parse('2026-11-07T11:00:00Z');
const validLoad = async () => ({ envelope, catalog });

test('uma consulta por sessão é compartilhada, com carregamento e data por aplicativo', async () => {
  let calls = 0;
  const states = [];
  const store = createCatalogStore({
    baseline,
    now: () => startTime,
    load: async () => {
      calls++;
      return validLoad();
    },
  });
  const unsubscribe = store.subscribe(() => states.push(store.getSnapshot()));
  const first = store.start();
  assert.equal(first, store.start());
  assert.equal(store.getSnapshot().loading, true);
  await first;
  assert.equal(calls, 1);
  assert.equal(
    states.some((state) => state.loading && state.attempts === 1),
    true,
  );
  const absentFromFixture = new Set(['geosptstruct', 'geostruct']);
  for (const id of CATALOG_IDS) {
    const product = store.getSnapshot().products[id];
    if (absentFromFixture.has(id)) {
      assert.equal(product.status, 'unknown');
      continue;
    }
    assert.equal(product.status, 'ready');
    assert.equal(product.stale, false);
    assert.equal(product.checkedAt, new Date(startTime).toISOString());
  }
  unsubscribe();
});

test('falha preserva último catálogo assinado e marca o dado como desatualizado', async () => {
  const store = createCatalogStore({
    baseline,
    load: async () => {
      throw new Error('offline');
    },
  });
  await store.start();
  const result = store.getSnapshot();
  assert.equal(result.failed, true);
  assert.equal(result.products.consolostruct.release.version, '0.6.0');
  assert.equal(result.products.molastruct.stale, true);
  assert.equal(result.products.armadurastruct.checkedAt, baseline.checkedAt);
  assert.match(availabilityLabel(result.products.armadurastruct), /desatualizado/);
});

test('falha parcial mantém o último produto válido, enquanto os demais são atualizados', async () => {
  const partial = structuredClone(catalog);
  partial.products.molastruct = { status: 'invalid', reason: 'missing' };
  const store = createCatalogStore({
    baseline,
    now: () => startTime,
    load: async () => ({ envelope, catalog: partial }),
  });
  await store.start();
  const result = store.getSnapshot().products;
  assert.equal(result.molastruct.release.version, '0.5.1');
  assert.equal(result.molastruct.issue, 'missing');
  assert.equal(result.molastruct.stale, true);
  assert.equal(result.consolostruct.stale, false);
  assert.equal(result.armadurastruct.stale, false);
});

test('catálogo assinado sem release retira a oferta, sem ressuscitar o download anterior', async () => {
  const unavailable = structuredClone(catalog);
  unavailable.products.armadurastruct = { status: 'unavailable' };
  const store = createCatalogStore({
    baseline,
    load: async () => ({ envelope, catalog: unavailable }),
  });
  await store.start();
  const product = store.getSnapshot().products.armadurastruct;
  assert.equal(product.status, 'unavailable');
  assert.equal(product.release, undefined);
  assert.equal(product.stale, false);
});

test('cache exige assinatura, não restaura objetos normalizados nem datas futuras', async () => {
  const badBaseline = {
    envelope: { ...envelope, signature: 'invalid' },
    checkedAt: baseline.checkedAt,
  };
  const badCache = {
    consolostruct: {
      envelope: { ...envelope, payload: envelope.payload + ' ' },
      checkedAt: baseline.checkedAt,
    },
    molastruct: { release: catalog.products.molastruct.release, checkedAt: baseline.checkedAt },
    armadurastruct: { envelope, checkedAt: '2099-01-01T00:00:00Z' },
  };
  const store = createCatalogStore({
    baseline: badBaseline,
    now: () => startTime,
    readCache: () => JSON.stringify(badCache),
    load: async () => {
      throw new Error('offline');
    },
  });
  await store.start();
  for (const product of Object.values(store.getSnapshot().products)) {
    assert.equal(product.status, 'unknown');
    assert.equal(product.release, undefined);
  }
});

test('cache válido é reverificado e a recusa de armazenamento não interrompe a consulta', async () => {
  const saved = Object.fromEntries(CATALOG_IDS.map((id) => [id, baseline]));
  const offline = createCatalogStore({
    baseline: { ...baseline, envelope: {} },
    readCache: () => JSON.stringify(saved),
    load: async () => {
      throw new Error('offline');
    },
  });
  await offline.start();
  assert.equal(offline.getSnapshot().products.molastruct.release.version, '0.5.1');
  assert.equal(offline.getSnapshot().products.molastruct.stale, true);
  const noStorage = createCatalogStore({
    baseline,
    readCache: () => {
      throw new Error('denied');
    },
    writeCache: () => {
      throw new Error('quota');
    },
    load: validLoad,
  });
  await noStorage.start();
  assert.equal(noStorage.getSnapshot().failed, false);
  assert.equal(noStorage.getSnapshot().products.molastruct.stale, false);
});

test('nova tentativa respeita intervalo, Retry-After, concorrência e limite de três consultas', async () => {
  let time = startTime;
  let calls = 0;
  let release;
  const store = createCatalogStore({
    baseline,
    now: () => time,
    load: async () => {
      calls++;
      if (calls === 1) throw new CatalogRequestError(120_000);
      if (calls === 2)
        return new Promise((resolve) => {
          release = () => resolve({ envelope, catalog });
        });
      return validLoad();
    },
  });
  await store.start();
  assert.equal(await store.refresh(), false);
  time += 60_000;
  store.tick();
  assert.equal(store.getSnapshot().canRetry, false);
  time += 60_000;
  store.tick();
  assert.equal(store.getSnapshot().canRetry, true);
  const pending = store.refresh();
  assert.equal(await store.refresh(), false);
  release();
  await pending;
  time += 60_000;
  await store.refresh();
  time += 60_000;
  store.tick();
  assert.equal(await store.refresh(), false);
  assert.equal(calls, 3);
  assert.equal(store.getSnapshot().canRetry, false);
});

test('os dados expiram em 15 minutos sem polling automático', async () => {
  let time = startTime;
  let calls = 0;
  const store = createCatalogStore({
    baseline,
    now: () => time,
    load: async () => {
      calls++;
      return validLoad();
    },
  });
  await store.start();
  time += CATALOG_TTL_MS;
  store.tick();
  assert.equal(store.getSnapshot().products.consolostruct.stale, true);
  assert.equal(store.getSnapshot().products.consolostruct.issue, 'expired');
  assert.equal(calls, 1);
});

test('catálogo anterior ao último dado conhecido não substitui as ofertas', async () => {
  const older = structuredClone(catalog);
  older.publishedAt = '2026-11-01T00:00:00Z';
  older.products.molastruct = { status: 'unavailable' };
  const store = createCatalogStore({ baseline, load: async () => ({ envelope, catalog: older }) });
  await store.start();
  assert.equal(store.getSnapshot().products.molastruct.release.version, '0.5.1');
  assert.equal(store.getSnapshot().products.molastruct.issue, 'rollback');
});

test('carregamento inicial difere de disponibilidade desconhecida sem inventar pacotes', () => {
  assert.equal(availabilityLabel(undefined, true), 'Consultando catálogo…');
  assert.equal(
    availabilityLabel({ status: 'unknown', stale: false }),
    'Disponibilidade não confirmada',
  );
  assert.equal(
    availabilityLabel({ status: 'unavailable', stale: false }, true),
    'Sem pacote no canal estável',
  );
});

test('falhas de rede, validação e compatibilidade conservam causas distintas e dados válidos', async () => {
  for (const [error, failure] of [
    [new Error('offline'), 'offline'],
    [new CatalogValidationError(), 'invalid'],
    [new SignatureVerificationUnavailableError(), 'unsupported'],
  ]) {
    const store = createCatalogStore({
      baseline,
      load: async () => {
        throw error;
      },
    });
    await store.start();
    const state = store.getSnapshot();
    assert.equal(state.failure, failure);
    assert.equal(state.products.armadurastruct.issue, failure);
    assert.equal(state.products.armadurastruct.status, 'ready');
    assert.equal(state.products.armadurastruct.stale, true);
    const empty = createCatalogStore({
      baseline: { ...baseline, envelope: {} },
      load: async () => {
        throw error;
      },
    });
    await empty.start();
    assert.equal(empty.getSnapshot().products.armadurastruct.status, 'unknown');
    assert.equal(empty.getSnapshot().products.armadurastruct.release, undefined);
    assert.equal(empty.getSnapshot().products.armadurastruct.issue, failure);
  }
});
