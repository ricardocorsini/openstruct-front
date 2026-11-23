import assert from 'node:assert/strict';
import test from 'node:test';
import { apps, currentApps, getCurrentApp, getPlannedApp } from '../src/lib/apps.ts';
import { getAppPage, getAppStatus, validateAppRegistry } from '../src/lib/app-registry.ts';

const copy = () => structuredClone(apps);

test('inclui KStruct entre os produtos atuais e mantém somente duas propostas no horizonte', () => {
  assert.doesNotThrow(() => validateAppRegistry(apps));
  assert.deepEqual(
    currentApps.map((app) => [app.name, app.route]),
    [
      ['ConsoloStruct', '/apps/consolostruct'],
      ['MolaStruct', '/apps/molastruct'],
      ['ArmaduraStruct', '/apps/armadurastruct'],
      ['GeoSPT', '/apps/geosptstruct'],
      ['GeoStruct', '/apps/geostruct'],
      ['KStruct', '/apps/kstruct'],
    ],
  );
  const planned = apps.filter((app) => app.stage === 'planned');
  assert.deepEqual(
    planned.map((app) => app.name),
    ['AnchorStruct', 'SlopeStruct'],
  );
  assert.equal(apps.length, 8);
  assert.deepEqual(
    planned.map((app) => app.number),
    ['07', '08'],
  );
  assert.deepEqual(planned.map(getAppStatus), ['A iniciar', 'A iniciar']);
  for (const app of planned) {
    assert.equal(app.distribution, undefined);
    assert.equal(app.code, undefined);
    assert.equal(app.repository, undefined);
  }
});

test('páginas informativas de propostas não criam um produto atual ou instalável', () => {
  for (const [id, description] of [
    ['anchorstruct', 'Cálculo de chumbadores.'],
    ['slopestruct', 'Estabilidade de taludes e contenções.'],
  ]) {
    const app = getPlannedApp(id);
    assert.equal(app.planningStatus, 'not-started');
    assert.equal(app.description, description);
    assert.equal(getAppPage(app).route, `/apps/${id}`);
    assert.equal(getAppPage(app).image, '/assets/app-em-breve.svg');
    assert.equal(getAppPage(app).imageAlt, 'Em breve — desenvolvimento não iniciado');
    assert.equal(app.route, undefined);
    assert.throws(() => getCurrentApp(id), /não cadastrado/);
  }
  const withoutPage = structuredClone(getPlannedApp('anchorstruct'));
  delete withoutPage.page;
  delete withoutPage.planningStatus;
  assert.doesNotThrow(() => validateAppRegistry([withoutPage]));
  assert.equal(getAppPage(withoutPage), undefined);
  assert.equal(getAppStatus(withoutPage), 'Em planejamento');
  assert.equal(getAppPage(currentApps[0]), currentApps[0]);
  assert.throws(() => getPlannedApp('consolostruct'), /sem página/);
  assert.throws(() => getPlannedApp('vigasstruct'), /sem página/);
  assert.throws(() => getPlannedApp('inexistente'), /sem página/);
  // O estado pertence ao planejamento, sem depender do nome ou de uma página.
  const renamed = { ...getPlannedApp('anchorstruct'), name: 'Outra proposta' };
  assert.equal(getAppStatus(renamed), 'A iniciar');
});

test('páginas planejadas validam estado, rota e arte, sem aceitar dados de distribuição', () => {
  for (const modify of [
    (app) => {
      app.planningStatus = '2027';
    },
    (app) => {
      delete app.planningStatus;
    },
    (app) => {
      app.page.route = '/apps/outro';
    },
    (app) => {
      app.page.image = 'https://example.com/art.svg';
    },
    (app) => {
      app.page.imageAlt = '';
    },
    (app) => {
      app.page.repository = { url: 'https://example.com' };
    },
    (app) => {
      app.page.download = 'https://example.com/app.exe';
    },
    (app) => {
      app.distribution = structuredClone(currentApps[0].distribution);
    },
    (app) => {
      app.code = structuredClone(currentApps[0].code);
    },
    (app) => {
      app.repository = structuredClone(currentApps[0].repository);
    },
  ]) {
    const data = copy();
    modify(data.find((app) => app.id === 'anchorstruct'));
    assert.throws(() => validateAppRegistry(data));
  }
});

test('rejeita id duplicado e metadados incompletos antes de servir o catálogo', () => {
  assert.throws(() => validateAppRegistry([...copy(), structuredClone(apps[0])]), /id único/);
  for (const key of [
    'name',
    'description',
    'repository',
    'documentation',
    'license',
    'code',
    'editorial',
  ]) {
    const data = copy();
    delete data[0][key];
    assert.throws(() => validateAppRegistry(data), undefined, key);
  }
  for (const value of [null, {}, []]) assert.throws(() => validateAppRegistry(value));
  assert.throws(() => getCurrentApp('produto-inexistente'), /não cadastrado/);
  assert.throws(() => getCurrentApp('vigasstruct'), /não cadastrado/);
});

test('planejamento não aceita versão, download ou repositório inventados', () => {
  for (const [key, value] of [
    ['code', { version: '1.0.0' }],
    ['distribution', structuredClone(apps[0].distribution)],
    ['version', '1.0.0'],
    ['downloadUrl', 'https://example.com/package.exe'],
    ['repository', structuredClone(apps[0].repository)],
    ['route', '/apps/anchorstruct'],
  ]) {
    const data = copy();
    data.find((app) => app.id === 'anchorstruct')[key] = value;
    assert.throws(() => validateAppRegistry(data), undefined, key);
  }
});

test('disponibilidade não promove a versão de código nem implica maturidade estável', () => {
  const mola = getCurrentApp('molastruct');
  assert.equal(mola.code.version, '0.7.0');
  assert.equal(mola.distribution.version, '0.5.1');
  assert.equal(mola.maturity, 'experimental');
  assert.equal(mola.distribution.channel, 'stable');
  assert.equal(getAppStatus(mola), 'Disponível para desktop');
  const armadura = getCurrentApp('armadurastruct');
  assert.equal(armadura.code.version, armadura.distribution.version);
  assert.notEqual(armadura.code.ref, armadura.distribution.sourceCommit);
  for (const app of currentApps) assert.equal(getAppStatus(app), 'Disponível para desktop');
  const unpublished = copy();
  delete unpublished[0].distribution;
  assert.doesNotThrow(() => validateAppRegistry(unpublished));
  assert.equal(getAppStatus(unpublished[0]), 'Em desenvolvimento');
});

test('ArmaduraStruct separa a release GPL do código posterior à tag', () => {
  const armadura = getCurrentApp('armadurastruct');
  assert.equal(armadura.distribution.version, '0.2.0');
  assert.equal(armadura.distribution.sourceTag, 'v0.2.0');
  assert.equal(armadura.documentation.ref, armadura.distribution.sourceCommit);
  assert.equal(armadura.license.spdx, 'GPL-3.0-or-later');
  assert.equal(armadura.license.ref, armadura.distribution.sourceCommit);
  assert.notEqual(armadura.code.ref, armadura.distribution.sourceCommit);
});

test('uma fonte posterior à tag não pode fundamentar a descrição do instalador', () => {
  const data = copy();
  const app = data[1];
  const evidence = app.editorial.sources.find((source) => source.kind === 'description');
  evidence.ref = app.code.ref;
  evidence.url = app.code.url.replace('package.json', 'README.md');
  assert.throws(() => validateAppRegistry(data), /fonte da versão distribuída/);
});

test('motor tem versão própria e fonte técnica vinculada à distribuição', () => {
  const consolo = getCurrentApp('consolostruct');
  assert.equal(consolo.engine.version, '0.3.0');
  assert.notEqual(consolo.engine.version, consolo.distribution.version);
  assert.equal(consolo.engine.ref, consolo.distribution.sourceCommit);
  for (const modify of [
    (app) => {
      delete app.engine.policy;
    },
    (app) => {
      app.engine.version = 'master';
    },
    (app) => {
      app.engine.ref = app.code.ref;
      app.engine.url = app.engine.url.replace(app.distribution.sourceCommit, app.code.ref);
    },
  ]) {
    const data = copy();
    modify(data[0]);
    assert.throws(() => validateAppRegistry(data));
  }
  const planned = copy();
  planned.find((app) => app.id === 'anchorstruct').engine = structuredClone(consolo.engine);
  assert.throws(() => validateAppRegistry(planned));
});

test('exige evidências fixadas, data de revisão e repositório declarado público', () => {
  for (const modify of [
    (app) => {
      app.editorial.reviewedAt = '2026-02-30';
    },
    (app) => {
      app.repository.visibility = 'private';
    },
    (app) => {
      delete app.repository.branch;
    },
    (app) => {
      app.documentation.ref = 'master';
    },
    (app) => {
      app.documentation.url = app.documentation.url.replace(app.documentation.ref, 'master');
    },
    (app) => {
      app.code.url = app.code.url.replace('https:', 'http:');
    },
    (app) => {
      app.editorial.sources = [];
    },
    (app) => {
      app.editorial.sources = app.editorial.sources.filter((s) => s.kind !== 'distribution');
    },
  ]) {
    const data = copy();
    modify(data[0]);
    assert.throws(() => validateAppRegistry(data));
  }
});

test('pacotes precisam pertencer ao produto, versão, plataforma e origem declarados', () => {
  for (const modify of [
    (release) => {
      release.platforms = [];
    },
    (release) => {
      release.platforms.push(structuredClone(release.platforms[0]));
    },
    (release) => {
      release.platforms[0].arch = 'arm64';
    },
    (release) => {
      release.platforms[0].format = 'zip';
    },
    (release) => {
      release.platforms[0].url = release.platforms[0].url.replace('github.com', 'example.com');
    },
    (release) => {
      release.platforms[0].url = release.platforms[0].url.replace('0.6.0-windows', '0.7.0-windows');
    },
    (release) => {
      release.releaseUrl = release.releaseUrl.replace('consolo-struct', 'mola-struct');
    },
  ]) {
    const data = copy();
    modify(data[0].distribution);
    assert.throws(() => validateAppRegistry(data));
  }
});
