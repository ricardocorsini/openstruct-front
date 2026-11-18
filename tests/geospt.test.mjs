import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateKeyPairSync, sign } from 'node:crypto';
import { getCurrentApp } from '../src/lib/apps.ts';
import { verifySignedCatalog } from '../src/lib/catalog.ts';
import { CATALOG_TRUST, CATALOG_URL } from '../src/lib/catalog-trust.ts';
import { manualInstallationOptions, productReleasesUrl } from '../src/lib/installation.ts';
import { emptyGithubSnapshot, validateGithubSnapshot } from '../src/lib/github-snapshot.ts';

const envelope = JSON.parse(
  await readFile(new URL('../src/data/catalog.signed.json', import.meta.url), 'utf8'),
);

test('GeoSPT vincula a página, a fonte original e os dois instaladores realmente assinados', async () => {
  const app = getCurrentApp('geosptstruct');
  const { products } = await verifySignedCatalog(envelope);
  const geo = products.geosptstruct;
  assert.equal(app.repository.url, 'https://github.com/itanervale/GEOSPT-STRUCT');
  assert.equal(app.documentation.ref, app.distribution.sourceCommit);
  assert.equal(app.license.spdx, null);
  assert.equal(geo.status, 'ready');
  assert.equal(geo.release.version, '2.0.7');
  assert.equal(geo.release.releaseUrl, app.distribution.releaseUrl);
  const view = manualInstallationOptions({ ...geo, stale: false }, 'Windows NT 10.0; Win64; x64');
  assert.deepEqual(view.packages.map((p) => p.asset.platform).sort(), ['linux', 'windows']);
  assert.ok(
    view.packages.every((p) =>
      p.asset.url.startsWith(
        'https://github.com/ricardocorsini/openstruct-catalog/releases/download/geosptstruct-v2.0.7/',
      ),
    ),
  );
  assert.ok(view.packages.every((p) => p.asset.sha256.length === 64));
  assert.equal(
    productReleasesUrl(app.id),
    'https://github.com/ricardocorsini/openstruct-catalog/releases',
  );
});

test('a chave compartilhada do publicador não permite usar a assinatura de ArmaduraStruct no GeoSPT', async () => {
  const payload = JSON.parse(envelope.payload);
  const geo = payload.apps.find((app) => app.id === 'geosptstruct');
  const armadura = payload.apps.find((app) => app.id === 'armadurastruct');
  geo.releases[0].assets[0].signature = armadura.releases[0].assets[0].signature;
  const pair = generateKeyPairSync('ed25519');
  const text = JSON.stringify(payload);
  const trust = {
    catalogKeyId: 'test-root',
    keys: {
      ...CATALOG_TRUST.keys,
      'test-root': Buffer.from(pair.publicKey.export({ format: 'jwk' }).x, 'base64url').toString(
        'base64',
      ),
    },
  };
  const result = await verifySignedCatalog(
    {
      payload: text,
      keyId: 'test-root',
      signature: sign(null, Buffer.from(text), pair.privateKey).toString('base64'),
    },
    CATALOG_URL,
    trust,
  );
  assert.equal(result.products.geosptstruct.status, 'invalid');
  assert.equal(result.products.armadurastruct.status, 'ready');
});

test('snapshots anteriores preservam fontes conhecidas e acrescentam apps sem inventar atividade', () => {
  const old = emptyGithubSnapshot();
  const added = ['itanervale/GEOSPT-STRUCT', 'ricardocorsini/geo-struct'];
  old.repositories = old.repositories.filter((repo) => !added.includes(repo.repository));
  const migrated = validateGithubSnapshot(old);
  assert.equal(migrated.repositories.length, old.repositories.length + added.length);
  assert.deepEqual(migrated.repositories.slice(0, old.repositories.length), old.repositories);
  for (const repository of added) {
    const geo = migrated.repositories.find((repo) => repo.repository === repository);
    assert.equal(geo.visibility, 'unknown');
    assert.equal(geo.status, 'unavailable');
    assert.equal(geo.lists.contributors.items.length, 0);
  }
  const missing = emptyGithubSnapshot();
  missing.repositories = missing.repositories.filter(
    (repo) => repo.repository !== 'ricardocorsini/consolo-struct',
  );
  assert.throws(() => validateGithubSnapshot(missing), /Missing required repository/);
});
