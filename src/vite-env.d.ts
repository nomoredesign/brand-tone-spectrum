/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Full URL of the Cloudflare Worker that accepts submissions, e.g.
   * `https://brand-tone-submit.example.workers.dev`. When this is empty or
   * missing the app hides the send button and the inbox link, and everything
   * else keeps working.
   */
  readonly VITE_SUBMIT_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
