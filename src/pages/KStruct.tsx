import { ArrowLeft, ArrowUpRight, BookOpen, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppStatus } from '../components/AppStatus';
import { ProductAvailability } from '../components/CatalogAvailability';
import { Contributors } from '../components/Contributors';
import { ProductInstallation } from '../components/ProductInstallation';
import { getCurrentApp } from '../lib/apps';
import './kstruct.css';

const app = getCurrentApp('kstruct');
const docs = `${app.repository.url}/blob/${app.documentation.ref}/docs`;

export function KStruct() {
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
        <div className="product-intro kstruct-intro">
          <div>
            <h2>
              Pórticos planos e <span className="blue-text">espaciais</span>
            </h2>
            <p>
              Lance vigas e pilares em planta e elevação, atribua apoios e cargas e acompanhe a
              resposta da estrutura. O KStruct usa o OOFEM 3.0 integrado para resolver a estática
              linear e apresentar deformadas, reações e esforços.
            </p>
            <div className="button-row">
              <a className="button button-primary" href="#instalar">
                <Download size={17} /> Opções de instalação
              </a>
              <a className="button button-outline" href={app.previewAnchor}>
                Ver a viga de referência
              </a>
            </div>
            <span className="product-meta">0.3.0 alpha · Windows e Linux x86_64</span>
          </div>
          <img
            className="kstruct-art"
            src={app.image}
            alt={app.imageAlt}
            width="512"
            height="512"
            fetchPriority="high"
          />
        </div>
      </section>
      <div className="container">
        <ProductAvailability app={app} />
      </div>

      <section className="section container" aria-labelledby="kstruct-recursos">
        <div className="section-heading">
          <h2 id="kstruct-recursos">Do lançamento aos esforços</h2>
        </div>
        <div className="feature-grid">
          <article>
            <h3>Eixos, pavimentos e vistas</h3>
            <p>
              Lance nós e barras em planta XY ou nas elevações XZ e YZ. Confira a perspectiva 3D,
              replique pavimentos e conecte interseções.
            </p>
          </article>
          <article>
            <h3>Padrões e casos de carga</h3>
            <p>
              Defina forças, momentos e cargas distribuídas. Monte casos estáticos atribuindo
              fatores a padrões como permanentes, sobrecarga e vento.
            </p>
          </article>
          <article>
            <h3>Diagramas e tabelas</h3>
            <p>
              Alterne entre casos calculados e consulte deformadas, reações, deslocamentos e
              esforços. O CSV identifica o caso de origem.
            </p>
          </article>
        </div>
        <p className="kstruct-scope">
          O modelo usa barras elásticas, seções retangulares e ligações rígidas. Salve seus projetos
          localmente em <code>.kstruct.json</code>.
        </p>
        <a className="text-link" href={`${docs}/VALIDATION.md`} target="_blank" rel="noreferrer">
          Benchmarks e limites da análise <ArrowUpRight size={16} />
        </a>
      </section>

      <section
        className="product-workflow"
        id="viga-de-referencia"
        aria-labelledby="kstruct-exemplo"
      >
        <div className="container">
          <div className="workflow-header">
            <h2 id="kstruct-exemplo">Resolva a viga de referência</h2>
          </div>
          <ol className="workflow-grid kstruct-steps">
            <li>
              <h3>Abra o modelo</h3>
              <p>
                Em <strong>Modelo</strong>, escolha <strong>Viga de referência</strong>. A viga tem
                vão de 6 m e carga distribuída de 10 kN/m para baixo.
              </p>
            </li>
            <li>
              <h3>Rode a análise</h3>
              <p>
                Clique em <strong>Analisar</strong>. A tabela de reações mostra 30 kN em cada apoio.
              </p>
            </li>
            <li>
              <h3>Confira o meio do vão</h3>
              <p>O momento fletor é 45 kN·m e o deslocamento vertical é −8,4375 mm.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section container" id="instalar" aria-labelledby="kstruct-instalar">
        <div className="access-grid">
          <div className="access-main">
            <h2 id="kstruct-instalar">Instale o KStruct</h2>
            <ProductInstallation app={app} />
          </div>
          <div className="access-secondary">
            <BookOpen size={26} aria-hidden="true" />
            <h3>Documentação e desenvolvimento</h3>
            <p>
              Acompanhe os modelos de validação e o roteiro de combinações, envelopes e análise
              dinâmica.
            </p>
            <ul className="kstruct-links">
              <li>
                <a className="text-link" href={app.documentation.url}>
                  Começar a usar o KStruct
                </a>
              </li>
              <li>
                <a className="text-link" href={app.repository.url}>
                  Código-fonte no GitHub
                </a>
              </li>
              <li>
                <Link className="text-link" to="/development?repo=k-struct">
                  Central de desenvolvimento
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>
      <Contributors repository="ricardocorsini/k-struct" />
    </>
  );
}
