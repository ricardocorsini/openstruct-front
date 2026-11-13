import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ExperienceProvider } from './components/Experience';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { site } from './lib/config';
import { getCurrentApp, getPlannedApp } from './lib/apps';
import { CatalogProvider } from './components/CatalogProvider';
import './styles.css';
import './molastruct.css';
import './geosptstruct.css';
import './launcher.css';
import './catalog.css';
import './home.css';

const Armadura = React.lazy(() =>
  import('./pages/Armadura').then((module) => ({ default: module.Armadura })),
);
const Catalog = React.lazy(() =>
  import('./pages/Catalog').then((module) => ({ default: module.Catalog })),
);
const Community = React.lazy(() =>
  import('./pages/Community').then((module) => ({ default: module.Community })),
);
const Consolo = React.lazy(() =>
  import('./pages/Consolo').then((module) => ({ default: module.Consolo })),
);
const Development = React.lazy(() =>
  import('./pages/Development').then((module) => ({ default: module.Development })),
);
const StructBot = React.lazy(() =>
  import('./pages/StructBot').then((module) => ({ default: module.StructBot })),
);
const GeoSPT = React.lazy(() =>
  import('./pages/GeoSPT').then((module) => ({ default: module.GeoSPT })),
);
const Launcher = React.lazy(() =>
  import('./pages/Launcher').then((module) => ({ default: module.Launcher })),
);
const Mola = React.lazy(() => import('./pages/Mola').then((module) => ({ default: module.Mola })));
const NotFound = React.lazy(() =>
  import('./pages/Community').then((module) => ({ default: module.NotFound })),
);
const Releases = React.lazy(() =>
  import('./pages/Releases').then((module) => ({ default: module.Releases })),
);
const ContributionManual = React.lazy(() =>
  import('./pages/ContributionManual').then((module) => ({ default: module.ContributionManual })),
);
const AiContribution = React.lazy(() =>
  import('./pages/AiContribution').then((module) => ({ default: module.AiContribution })),
);
const DocsRoutes = React.lazy(() =>
  import('./pages/DocsRoutes').then((module) => ({ default: module.DocsRoutes })),
);
const Anchor = React.lazy(() =>
  import('./pages/Planned').then((module) => ({ default: module.Anchor })),
);
const Slope = React.lazy(() =>
  import('./pages/Planned').then((module) => ({ default: module.Slope })),
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CatalogProvider>
        <ExperienceProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="apps" element={<Catalog />} />
              <Route path={getCurrentApp('consolostruct').route} element={<Consolo />} />
              <Route path={getCurrentApp('molastruct').route} element={<Mola />} />
              <Route path={getCurrentApp('armadurastruct').route} element={<Armadura />} />
              <Route path={getCurrentApp('geosptstruct').route} element={<GeoSPT />} />
              <Route path={getPlannedApp('anchorstruct').page.route} element={<Anchor />} />
              <Route path={getPlannedApp('slopestruct').page.route} element={<Slope />} />
              <Route path="launcher" element={<Launcher />} />
              <Route
                path="docs/*"
                element={
                  <React.Suspense
                    fallback={
                      <div className="container page-hero" role="status">
                        Carregando documentação…
                      </div>
                    }
                  >
                    <DocsRoutes />
                  </React.Suspense>
                }
              />
              <Route path="community" element={<Community />} />
              <Route
                path="community/como-colaborar"
                element={
                  <React.Suspense
                    fallback={
                      <div className="container page-hero" role="status">
                        Carregando manual…
                      </div>
                    }
                  >
                    <ContributionManual />
                  </React.Suspense>
                }
              />
              <Route
                path="releases"
                element={
                  <React.Suspense
                    fallback={
                      <div className="container page-hero" role="status">
                        Carregando releases…
                      </div>
                    }
                  >
                    <Releases />
                  </React.Suspense>
                }
              />
              <Route path="structbot" element={<StructBot />} />
              <Route path={site.developmentPath} element={<Development />} />
              <Route
                path="development/contribuir-com-ia"
                element={
                  <React.Suspense
                    fallback={
                      <div className="container page-hero" role="status">
                        Carregando guia…
                      </div>
                    }
                  >
                    <AiContribution />
                  </React.Suspense>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ExperienceProvider>
      </CatalogProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
