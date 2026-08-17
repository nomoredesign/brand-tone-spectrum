import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * GitHub Pages serves a project site from `https://<user>.github.io/<repo>/`, so the
 * built assets need `/<repo>/` as their base. Deriving it from `GITHUB_REPOSITORY`
 * keeps the repository name out of the source, so a rename or a fork needs no edit.
 * A user or organisation site (`<user>.github.io`) is served from the root instead.
 */
function resolveBase(): string {
  const explicit = process.env.VITE_BASE;
  if (explicit) return explicit.endsWith('/') ? explicit : `${explicit}/`;

  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) return '/';

  const name = repository.split('/')[1];
  if (!name || name.endsWith('.github.io')) return '/';
  return `/${name}/`;
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
