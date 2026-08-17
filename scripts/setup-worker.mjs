#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Creates the KV namespace the worker stores submissions in, and writes its id
 * into wrangler.toml.
 *
 * It deliberately does not touch the three secrets. Those are an API key, a
 * password and an address, and they are typed straight into Wrangler by the
 * person who owns them so they never pass through a script or a shell history.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(root, 'worker', 'wrangler.toml');
const PLACEHOLDER = 'replace-with-your-kv-namespace-id';

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function run(args) {
  return execFileSync('npx', ['wrangler', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  });
}

let whoami;
try {
  whoami = run(['whoami']);
} catch {
  fail('Could not run Wrangler at all. Try `npm install` first.');
}

if (whoami.includes('not authenticated')) {
  fail(
    'Cloudflare is not logged in yet. Run this first, which opens a browser:\n\n  npx wrangler login\n\nThen run this again.',
  );
}

const config = await readFile(configPath, 'utf8');

if (!config.includes(PLACEHOLDER)) {
  const existing = /id\s*=\s*"([^"]+)"/.exec(config)?.[1];
  fail(
    `wrangler.toml already names a KV namespace (${existing ?? 'unknown'}).\n` +
      'Nothing has been changed. Remove that id by hand if you really want a new one.',
  );
}

console.log('Creating the KV namespace...');

let output;
try {
  output = run(['kv', 'namespace', 'create', 'SUBMISSIONS']);
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  fail(`Wrangler would not create the namespace.\n\n${detail}`);
}

// Wrangler has printed this a few different ways over the years, so both the
// TOML snippet and the JSON form are accepted.
const id = (/id\s*=\s*"([0-9a-fA-F]{32})"/.exec(output) ??
  /"id"\s*:\s*"([0-9a-fA-F]{32})"/.exec(output))?.[1];

if (!id) {
  fail(
    `The namespace may have been created, but its id could not be read from what Wrangler printed:\n\n${output}\n\n` +
      `Put the id into worker/wrangler.toml by hand, replacing ${PLACEHOLDER}.`,
  );
}

await writeFile(configPath, config.replace(PLACEHOLDER, id), 'utf8');

console.log(`
Done. worker/wrangler.toml now points at KV namespace ${id}.

Next, set the three secrets. Each one asks for the value and does not echo it,
so nothing lands in your shell history:

  npx wrangler secret put RESEND_API_KEY --config worker/wrangler.toml
  npx wrangler secret put STUDIO_TOKEN --config worker/wrangler.toml
  npx wrangler secret put NOTIFY_EMAIL --config worker/wrangler.toml

For a studio token, this prints one worth using:

  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

Then deploy:

  npm run worker:deploy
`);
