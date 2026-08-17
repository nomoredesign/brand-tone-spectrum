#!/usr/bin/env node
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Copies the template to a new client file and makes the folder its reference
 * images will live in. Everything after that is editing JSON by hand, which is
 * the point: a client is a file, not a database row.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const slug = process.argv[2];

if (!slug) {
  fail('Give the client a slug, for example:\n\n  npm run new-client acme-corp\n');
}

if (!SLUG_PATTERN.test(slug)) {
  fail(
    `"${slug}" will not work as a slug.\n\n` +
      'Use lower case letters, numbers and hyphens, for example acme-corp.\n' +
      'It becomes part of the URL the client is sent.',
  );
}

const configPath = join(root, 'clients', `${slug}.json`);
const refsPath = join(root, 'public', 'refs', slug);

if (await exists(configPath)) {
  fail(`clients/${slug}.json already exists. Nothing has been changed.`);
}

const template = JSON.parse(await readFile(join(root, 'clients', '_template.json'), 'utf8'));

// A readable placeholder is better than an empty string: it is obvious in the
// page what has not been filled in yet.
const words = slug.split('-').map((word) => word.toUpperCase());
template.slug = slug;
template.clientName = words.join(' ');

await writeFile(configPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
await mkdir(refsPath, { recursive: true });

console.log(`Made clients/${slug}.json and public/refs/${slug}/.

Next:
  1. Edit clients/${slug}.json: the client name, the project line, the date
     line, and the pairs. Add, remove or rename pairs as the project needs.
  2. Check it at http://localhost:5173/#/c/${slug} with npm run dev.
  3. Commit and push, then send the client their link.

docs/ADDING_A_CLIENT.md has the whole thing written out.`);
