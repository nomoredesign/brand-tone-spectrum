import { AnswersSchema, ClientConfigSchema, type Answers, type ClientConfig } from '@shared/schema';

/**
 * Client configs are bundled at build time rather than fetched, so a file that
 * has been deleted or renamed breaks the build instead of breaking the page in
 * front of a client.
 *
 * Two globs, because `clients/` holds two kinds of file: a config per client,
 * and an optional agreed answers file the studio commits alongside it. The
 * underscore prefixed template is not a client and is skipped.
 */
const configModules = import.meta.glob<unknown>(
  ['/clients/*.json', '!/clients/_*.json', '!/clients/*.answers.json'],
  { eager: true, import: 'default' },
);

const answerModules = import.meta.glob<unknown>('/clients/*.answers.json', {
  eager: true,
  import: 'default',
});

function baseName(path: string, suffix: string): string {
  const file = path.slice(path.lastIndexOf('/') + 1);
  return file.slice(0, file.length - suffix.length);
}

function describeFailure(path: string, error: unknown): Error {
  const detail =
    error instanceof Error ? error.message : `Unexpected problem: ${JSON.stringify(error)}`;
  return new Error(`${path} is not a valid file.\n${detail}`);
}

function loadConfigs(): ReadonlyMap<string, ClientConfig> {
  const byslug = new Map<string, ClientConfig>();

  for (const [path, raw] of Object.entries(configModules)) {
    const result = ClientConfigSchema.safeParse(raw);
    if (!result.success) throw describeFailure(path, result.error);

    const config = result.data;
    const expected = baseName(path, '.json');
    if (config.slug !== expected) {
      throw new Error(
        `${path} declares slug "${config.slug}" but the file is named "${expected}".`,
      );
    }
    if (byslug.has(config.slug)) {
      throw new Error(`Two client files claim the slug "${config.slug}".`);
    }

    byslug.set(config.slug, config);
  }

  return byslug;
}

/**
 * Answers the studio has agreed and committed to the repository. When one exists
 * the page starts from it rather than from the config defaults, and reset returns
 * to it. Anything saved in the browser still wins over both.
 */
function loadCommittedAnswers(
  configs: ReadonlyMap<string, ClientConfig>,
): ReadonlyMap<string, Answers> {
  const bySlug = new Map<string, Answers>();

  for (const [path, raw] of Object.entries(answerModules)) {
    const result = AnswersSchema.safeParse(raw);
    if (!result.success) throw describeFailure(path, result.error);

    const answers = result.data;
    const expected = baseName(path, '.answers.json');
    if (answers.slug !== expected) {
      throw new Error(
        `${path} declares slug "${answers.slug}" but the file is named "${expected}".`,
      );
    }
    if (!configs.has(answers.slug)) {
      throw new Error(`${path} has no matching client config at clients/${answers.slug}.json.`);
    }

    bySlug.set(answers.slug, answers);
  }

  return bySlug;
}

const configsBySlug = loadConfigs();
const committedAnswersBySlug = loadCommittedAnswers(configsBySlug);

/** Every client, ordered by name, for the studio's index page. */
export function listClients(): ClientConfig[] {
  return [...configsBySlug.values()].sort((a, b) => a.clientName.localeCompare(b.clientName, 'en'));
}

export function getClientConfig(slug: string | undefined): ClientConfig | undefined {
  return slug === undefined ? undefined : configsBySlug.get(slug);
}

export function getCommittedAnswers(slug: string): Answers | undefined {
  return committedAnswersBySlug.get(slug);
}
