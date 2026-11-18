import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppStatus } from '../components/AppStatus';
import { ProductAvailability } from '../components/CatalogAvailability';
import { Contributors } from '../components/Contributors';
import { ProductInstallation } from '../components/ProductInstallation';
import { getCurrentApp } from '../lib/apps';
import { LAUNCHER_INSTALL_LABEL } from '../lib/installation';
import { manualSystemPath } from '../lib/manual-chapters';
import './geostruct.css';

const app = getCurrentApp('geostruct');
const sourceDocs = `${app.repository.url}/blob/${app.documentation.ref}/docs`;

export function GeoStruct() {
  return (
    <>
      <section className="product-hero container">
        <Link className="back-link" to="/apps">
          <ArrowLeft size={15} /> Todos os aplicativos
        </Link>
        <div className="product-identity">
          <div>
            <span className="eyebrow">{app.category}</span>
            <h1>{app.name}</h1>
          </div>
          <AppStatus app={app} />
        </div>
        <div className="product-intro geostruct-intro">
          <div className="geostruct-intro-copy">
            <h2>
              Estabilidade de <span className="blue-text">taludes em 2D</span>
            </h2>
            <p>
              Modele o terreno, as camadas de solo, a água e as sobrecargas. Compare Fellenius e
              Bishop Simplificado em uma superfície circular ou em uma malha de centros e raios.
            </p>
            <div className="button-row">
              <Link className="button button-primary" to="/launcher">
                <Download size={17} /> {LAUNCHER_INSTALL_LABEL}
              </Link>
              <a className="button button-outline" href={app.previewAnchor}>
                Ver projeto padrão <ArrowRight size={17} />
              </a>
            </div>
            <span className="product-meta">Windows e Linux x86_64 · Guia da versão 0.2.0</span>
          </div>
          <img
            className="geostruct-art"
            src={app.image}
            alt={app.imageAlt}
            width="768"
            height="768"
            fetchPriority="high"
          />
        </div>
      </section>
      <div className="container">
        <ProductAvailability app={app} />
      </div>

      <section className="section container" id="recursos" aria-labelledby="geostruct-recursos">
        <div className="section-heading">
          <h2 id="geostruct-recursos">Do perfil do terreno à análise</h2>
        </div>
        <div className="feature-grid">
          <article>
            <h3>Modelo geotécnico</h3>
            <p>
              Edite seções e regiões de solo no desenho ou por tabela. Atribua materiais
              Mohr–Coulomb com parâmetros efetivos ou totais e defina a linha piezométrica e as
              faixas de sobrecarga de cada caso.
            </p>
          </article>
          <article>
            <h3>Círculo fixo</h3>
            <p>
              Defina o centro e o raio, prepare as fatias e calcule o fator de segurança pelos dois
              métodos. Inspecione áreas, pesos, pressões e parcelas de resistência por fatia.
            </p>
          </article>
          <article>
            <h3>Busca circular</h3>
            <p>
              Varie centros e raios em uma malha de até 10.000 círculos. Confira o menor fator de
              segurança positivo admissível por método, os avisos de borda e os motivos de descarte
              na malha avaliada.
            </p>
          </article>
        </div>
        <p className="geostruct-scope">
          Salve o modelo e os casos em <code>.geo.json</code>. O relatório reúne os dados de entrada
          em HTML ou PDF por impressão, e o desenho pode ser exportado em SVG.
        </p>
        <a
          className="text-link"
          href={`${sourceDocs}/VALIDACAO.md`}
          target="_blank"
          rel="noreferrer"
        >
          Hipóteses, verificações e limites de aplicação <ArrowUpRight size={16} />
        </a>
      </section>

      <section className="product-workflow" id="projeto-padrao" aria-labelledby="geostruct-exemplo">
        <div className="container">
          <div className="workflow-header">
            <h2 id="geostruct-exemplo">Comece pelo projeto padrão</h2>
          </div>
          <ol className="workflow-grid geostruct-steps">
            <li>
              <h3>Abra o exemplo</h3>
              <p>
                Na tela inicial ou em <strong>Arquivo → Projeto</strong>, escolha{' '}
                <strong>Abrir projeto padrão</strong>. O modelo tem dois solos, linha piezométrica e
                sobrecarga na crista.
              </p>
            </li>
            <li>
              <h3>Execute a busca</h3>
              <p>
                No caso <strong>Talude — busca circular</strong>, selecione{' '}
                <strong>Iniciar busca circular</strong> para comparar Fellenius e Bishop nas 27
                combinações do exemplo.
              </p>
            </li>
            <li>
              <h3>Inspecione as fatias</h3>
              <p>
                Abra <strong>Ver círculos avaliados</strong> ou selecione o caso{' '}
                <strong>Talude — círculo fixo</strong> e use <strong>Preparar fatias</strong> para
                conferir as parcelas em uma superfície específica.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section container" id="instalar" aria-labelledby="geostruct-instalar">
        <div className="access-grid">
          <div className="access-main">
            <h2 id="geostruct-instalar">Instale o GeoStruct</h2>
            <ProductInstallation app={app} />
          </div>
          <div className="access-secondary">
            <BookOpen size={26} aria-hidden="true" />
            <h3>Documentação e código</h3>
            <p>Consulte o guia da versão publicada ou acompanhe o desenvolvimento no GitHub.</p>
            <ul className="geostruct-links">
              <li>
                <Link className="text-link" to={manualSystemPath(app.id)}>
                  Documentação do GeoStruct <ArrowRight size={16} />
                </Link>
              </li>
              <li>
                <a
                  className="text-link"
                  href={app.documentation.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Guia completo de uso <ArrowUpRight size={16} />
                </a>
              </li>
              <li>
                <a className="text-link" href={app.repository.url} target="_blank" rel="noreferrer">
                  Código-fonte no GitHub <ArrowUpRight size={16} />
                </a>
              </li>
              <li>
                <Link className="text-link" to="/development?repo=geo-struct">
                  Central de desenvolvimento <ArrowRight size={16} />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>
      <Contributors repository="ricardocorsini/geo-struct" />
    </>
  );
}
