import type { Env as WorkerEnv } from '../src/index';

/**
 * `cloudflare:test` types its `env` as `Cloudflare.Env`. Pointing that at the
 * worker's own Env means the tests see the same bindings the worker does, and a
 * binding added in one place has to be added in the other.
 */
declare global {
  namespace Cloudflare {
    // Empty on purpose: this exists to merge the worker's Env into the one the
    // test helpers already declare, not to add anything of its own.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Env extends WorkerEnv {}
  }
}

export {};
