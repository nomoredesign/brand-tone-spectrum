import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

/**
 * The worker's tests run inside workerd itself rather than in Node, so KV, the
 * request handling and the runtime APIs behave as they will once deployed.
 */
export default defineConfig({
  // Anchored to this folder, so the run works the same from the repository root.
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml' },
      miniflare: {
        // Stand-ins for the secrets, which never exist outside the worker.
        bindings: {
          ALLOWED_ORIGINS: 'https://studio.example.com,http://localhost:5173',
          FROM_EMAIL: 'brand-tone@example.com',
          APP_URL: 'https://studio.example.com/tool/',
          RESEND_API_KEY: 'test-key',
          STUDIO_TOKEN: 'test-studio-token',
          NOTIFY_EMAIL: 'studio@example.com',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
