import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, GitFork, Menu, Moon, Sun, X, ArrowRight, Download, Bot } from 'lucide-react';
import { Brand, Mark } from './Brand';
import { useExperience } from './Experience';
import { site } from '../lib/config';
import { apps, currentApps } from '../lib/apps';
import { getAppPage } from '../lib/app-registry';
import { CONTRIBUTION_MANUAL_PATH } from '../lib/contribution-manual';
import { AI_CONTRIBUTION_PATH } from '../lib/ai-contribution';

function ScrollToRoute() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    // O leitor da documentação controla seu foco e suas âncoras assíncronas.
    if (/^\/docs(?:\/|$)/i.test(pathname)) return;
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const frame = requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark',
  );
  const { launch, community } = useExperience();
  const location = useLocation();
  useEffect(() => {
    // A documentação restaura o foco após montar suas páginas e capítulos assíncronos.
    if (/^\/docs(?:\/|$)/i.test(location.pathname)) return;
    const page =
      location.pathname === '/'
        ? 'Engenharia aberta.'
        : (apps.find((app) => getAppPage(app)?.route === location.pathname)?.name ??
          (location.pathname === '/apps'
            ? 'Aplicativos'
            : location.pathname === '/launcher'
              ? 'Struct Launcher'
              : location.pathname === '/community'
                ? 'Comunidade'
                : location.pathname === CONTRIBUTION_MANUAL_PATH
                  ? 'Como colaborar'
                  : location.pathname === AI_CONTRIBUTION_PATH
                    ? 'Contribuir com IA'
                    : location.pathname === '/releases'
                      ? 'Releases'
                      : location.pathname === '/structbot'
                        ? 'StructBot'
                        : location.pathname === site.developmentPath
                          ? 'Central de desenvolvimento'
                          : 'Página não encontrada'));
    document.title = `${page} — OpenStruct`;
  }, [location.pathname]);
  function changeTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try {
      localStorage.setItem('openstruct-theme-v1', next ? 'dark' : 'light');
    } catch {
      /* Preferência apenas desta sessão. */
    }
  }
  const close = () => setOpen(false);
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="header-inner container">
          <Link
            className="brand-link"
            to="/"
            onClick={close}
            aria-label="OpenStruct, página inicial"
          >
            <Brand />
          </Link>
          <nav
            className={`main-nav ${open ? 'is-open' : ''}`}
            aria-label="Navegação principal"
            id="main-navigation"
          >
            <NavLink to="/apps" onClick={close}>
              Aplicativos
            </NavLink>
            <NavLink to="/docs" onClick={close}>
              Documentação
            </NavLink>
            <NavLink to="/community" onClick={close}>
              Comunidade
            </NavLink>
            <NavLink to={site.developmentPath} onClick={close}>
              Desenvolvimento
            </NavLink>
            <NavLink to="/structbot" className="nav-structbot" onClick={close}>
              <Bot size={16} aria-hidden="true" /> StructBot
            </NavLink>
            <Link to="/launcher" className="button button-primary mobile-launch" onClick={close}>
              Baixar Launcher <Download size={15} />
            </Link>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button theme-button"
              onClick={changeTheme}
              aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link to="/launcher" className="button button-primary desktop-launch">
              Baixar Launcher <Download size={16} />
            </Link>
            <button
              className="icon-button menu-toggle"
              aria-controls="main-navigation"
              aria-expanded={open}
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="conteudo">
        <Suspense
          fallback={
            <div className="container page-hero" role="status">
              Carregando…
            </div>
          }
        >
          <Outlet />
          <ScrollToRoute />
        </Suspense>
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-intro">
              <Link to="/" className="brand-link" aria-label="OpenStruct, início">
                <Brand />
              </Link>
              <p>
                Ferramentas abertas.
                <br />
                Novas formas de fazer engenharia.
              </p>
              <Link className="text-link" to={site.developmentPath}>
                <GitFork size={17} /> Construído em público <ArrowRight size={15} />
              </Link>
            </div>
            <div>
              <span className="footer-heading">ECOSSISTEMA</span>
              <Link to="/apps">Todos os aplicativos</Link>
              {currentApps.map((app) => (
                <Link to={app.route} key={app.id}>
                  {app.name}
                </Link>
              ))}
              <Link to="/launcher">Baixar o Struct Launcher</Link>
              <button onClick={launch}>
                Abrir aplicativos <ArrowUpRight size={13} />
              </button>
            </div>
            <div>
              <span className="footer-heading">EXPLORE</span>
              <Link to="/docs">Documentação</Link>
              <Link to={site.developmentPath}>Central de desenvolvimento</Link>
              <Link to="/structbot">StructBot · painel de atividade</Link>
              <Link to="/releases">Releases e notas de versão</Link>
              <Link to="/docs#principios">Princípios</Link>
              <a href="/assets/openstruct-mark.svg" download>
                Marca em SVG <ArrowUpRight size={13} />
              </a>
            </div>
            <div>
              <span className="footer-heading">CONSTRUA COM A GENTE</span>
              <a href={site.websiteRepository} target="_blank" rel="noreferrer">
                Código deste site <ArrowUpRight size={13} />
              </a>
              <button onClick={community}>
                Discord <ArrowUpRight size={13} />
              </button>
              <Link to={CONTRIBUTION_MANUAL_PATH}>
                Como colaborar <ArrowRight size={13} />
              </Link>
              <Link to={AI_CONTRIBUTION_PATH}>Contribuir com IA</Link>
              <Link to="/community#contribuidores">Contribuidores e créditos</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} OpenStruct.</span>
            <span className="footer-note">
              <Mark monochrome /> Feito por quem gosta de entender como funciona.
            </span>
            <a
              href={`${site.websiteRepository}/blob/master/LICENSE`}
              target="_blank"
              rel="noreferrer"
            >
              Licença deste site · MIT <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
