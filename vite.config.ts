import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compileManualMarkdown, indexManualMarkdown } from './scripts/manual-markdown.ts';
import type { ManualSearchSection } from './src/lib/manual-search.ts';
import {
  manualChapterPath,
  manualSystems,
  publicManualChapters,
  publicManualEditions,
  validateManualSystems,
} from './src/lib/manual-chapters.ts';

const manualContentId = 'virtual:manual-content';
const resolvedManualContentId = `\0${manualContentId}`;
const manualSearchId = 'virtual:manual-search';
const resolvedManualSearchId = `\0${manualSearchId}`;
const searchEditionPrefix = `${manualSearchId}/`;
const resolvedSearchEditionPrefix = `\0${searchEditionPrefix}`;
const manualRoot = new URL('./src/content/manuals/', import.meta.url);
const searchEditions = new Map(
  manualSystems.flatMap((system) =>
    publicManualEditions(system).map((edition) => {
      const key: string = `${system.id}/${edition.id}`;
      return [key, { system, edition }] as const;
    }),
  ),
);

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: 'manual-markdown',
      configResolved() {
        validateManualSystems(manualSystems);
      },
      resolveId(id) {
        if (id === manualContentId) return resolvedManualContentId;
        if (id === manualSearchId) return resolvedManualSearchId;
        if (
          id.startsWith(searchEditionPrefix) &&
          searchEditions.has(id.slice(searchEditionPrefix.length))
        ) {
          return `\0${id}`;
        }
      },
      async load(id) {
        if (id === resolvedManualContentId) {
          const entries = manualSystems.flatMap((system) =>
            publicManualEditions(system).flatMap((edition) =>
              publicManualChapters(edition).map(({ source }) => {
                const modulePath = JSON.stringify(`/src/content/manuals/${source}?manual`);
                return `${JSON.stringify(source)}: () => import(${modulePath}).then((module) => module.default)`;
              }),
            ),
          );
          return `export default {${entries.join(',')}};`;
        }
        if (id === resolvedManualSearchId) {
          const entries = [...searchEditions.keys()].map((key) => {
            const modulePath = JSON.stringify(`${searchEditionPrefix}${key}`);
            return `${JSON.stringify(key)}: () => import(${modulePath}).then((module) => module.default)`;
          });
          return `export default {${entries.join(',')}};`;
        }
        if (id.startsWith(resolvedSearchEditionPrefix)) {
          const entry = searchEditions.get(id.slice(resolvedSearchEditionPrefix.length));
          if (!entry) return;
          const { system, edition } = entry;
          const sections = await Promise.all(
            publicManualChapters(edition).map(async (chapter): Promise<ManualSearchSection[]> => {
              const chapterStatus = chapter.status;
              if (chapterStatus === 'draft') return [];
              const path = fileURLToPath(new URL(chapter.source, manualRoot));
              this.addWatchFile(path);
              const index = indexManualMarkdown(await readFile(path, 'utf8'));
              const chapterPath = manualChapterPath(system.id, edition.id, chapter.slug);
              return index.map(({ id, title, text }) => ({
                systemId: system.id,
                systemName: system.name,
                editionId: edition.id,
                editionTitle: edition.title,
                appVersion: edition.coverage?.version ?? null,
                historical: system.currentEditionId !== edition.id,
                chapterTitle: chapter.title,
                chapterStatus,
                href: id ? `${chapterPath}#${id}` : chapterPath,
                sectionTitle: title || chapter.title,
                text,
                keywords: chapter.keywords,
              }));
            }),
          );
          return `export default ${JSON.stringify(sections.flat())};`;
        }
        if (!id.endsWith('.md?manual')) return;
        const path = id.slice(0, -'?manual'.length);
        this.addWatchFile(path);
        const chapter = compileManualMarkdown(await readFile(path, 'utf8'));

        if (chapter.diagnostics.length) {
          const messages = chapter.diagnostics.map(({ message }) => message).join('\n');
          if (command === 'build') this.error({ id: path, message: messages });
          else this.warn({ id: path, message: messages });
        }

        return `export default ${JSON.stringify(chapter)};`;
      },
    },
  ],
  server: {
    allowedHosts: ['terminal.local'],
    proxy: {
      '/structbot-api': {
        target: 'https://api.openstruct.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/structbot-api/, '/api/v1/public'),
      },
    },
  },
}));
