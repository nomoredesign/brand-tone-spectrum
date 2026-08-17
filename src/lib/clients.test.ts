import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AnswersSchema, ClientConfigSchema } from '@shared/schema';
import { getClientConfig, getCommittedAnswers, listClients } from './clients';

const clientsDir = join(process.cwd(), 'clients');
const files = readdirSync(clientsDir).filter((name) => name.endsWith('.json'));

function read(name: string): unknown {
  return JSON.parse(readFileSync(join(clientsDir, name), 'utf8'));
}

/**
 * Reading the folder from disk rather than through the bundler means the
 * template is checked too, and a broken file fails CI rather than the page.
 */
describe('every file in clients/', () => {
  const configFiles = files.filter((name) => !name.endsWith('.answers.json'));
  const answerFiles = files.filter((name) => name.endsWith('.answers.json'));

  it('contains at least the template and two clients', () => {
    expect(configFiles).toContain('_template.json');
    expect(configFiles.length).toBeGreaterThanOrEqual(3);
  });

  it.each(configFiles)('%s is a valid client config', (name) => {
    const result = ClientConfigSchema.safeParse(read(name));
    expect(result.success ? null : result.error.issues).toBeNull();
  });

  it.each(answerFiles.length > 0 ? answerFiles : ['(none)'])(
    '%s is a valid answers file',
    (name) => {
      if (name === '(none)') return;
      const result = AnswersSchema.safeParse(read(name));
      expect(result.success ? null : result.error.issues).toBeNull();
    },
  );

  it.each(configFiles.filter((name) => !name.startsWith('_')))(
    '%s is named after its own slug',
    (name) => {
      const parsed = ClientConfigSchema.parse(read(name));
      expect(`${parsed.slug}.json`).toBe(name);
    },
  );
});

describe('the loader', () => {
  it('lists the clients but not the template', () => {
    const slugs = listClients().map((client) => client.slug);
    expect(slugs).toContain('carnot-ai');
    expect(slugs).toContain('demo-studio');
    expect(slugs).not.toContain('your-client-slug');
  });

  it('orders the list by client name', () => {
    const names = listClients().map((client) => client.clientName);
    expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
  });

  it('finds a client by slug and reports an unknown one', () => {
    expect(getClientConfig('carnot-ai')?.clientName).toBe('CARNOT AI');
    expect(getClientConfig('nobody')).toBeUndefined();
    expect(getClientConfig(undefined)).toBeUndefined();
  });

  it('has no committed answers for a client that has not agreed any', () => {
    expect(getCommittedAnswers('carnot-ai')).toBeUndefined();
  });
});
