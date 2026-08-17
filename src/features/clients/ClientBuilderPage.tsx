import { useLayoutEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getClientConfig, listClients } from '@/lib/clients';
import { copyToClipboard, downloadText } from '@/lib/files';
import { defaultAnswers } from '@/features/session/answers';
import { useSession } from '@/features/session/store';
import { SpectrumSheet } from '@/features/spectrum/SpectrumSheet';
import { NotFoundPage } from '@/app/routes/NotFoundPage';
import { AxisEditor } from './AxisEditor';
import { ThemeEditor } from './ThemeEditor';
import {
  buildConfig,
  draftFromConfig,
  emptyDraft,
  fileNameFor,
  serialiseConfig,
  slugify,
  type ClientDraft,
  type DraftIssue,
} from './draft';

function issueFor(issues: DraftIssue[], field: string): string | undefined {
  return issues.find((issue) => issue.field === field)?.message;
}

/**
 * Builds a client file. It cannot write to the repository from a static page, so
 * it produces the file and says exactly where to put it. Everything it makes has
 * been through the same schema the app loads files with, so a file from here
 * cannot be one the tool refuses.
 */
export function ClientBuilderPage({ mode }: { mode: 'new' | 'edit' }) {
  const { slug: editingSlug } = useParams<{ slug: string }>();
  const existing = mode === 'edit' ? getClientConfig(editingSlug) : undefined;

  if (mode === 'edit' && !existing) return <NotFoundPage title="No such client" />;

  return <Builder key={existing?.slug ?? 'new'} existing={existing} />;
}

function Builder({ existing }: { existing: ReturnType<typeof getClientConfig> }) {
  // The studio block is the same for every client, so a new one starts from an
  // existing client's rather than from the template's placeholder.
  const firstClient = listClients()[0];
  const [draft, setDraft] = useState<ClientDraft>(() =>
    existing ? draftFromConfig(existing) : emptyDraft(firstClient?.studio),
  );
  // Until the slug is edited by hand it follows the client's name.
  const [slugEdited, setSlugEdited] = useState(existing !== undefined);
  const [notice, setNotice] = useState<string | null>(null);

  /*
   * A blank form is not a form full of mistakes. A fault is only shown once the
   * field it belongs to has been visited, so the page does not open covered in
   * red before anything has been typed.
   */
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const touch = (field: string) => setTouched((current) => new Set(current).add(field));

  const built = useMemo(() => buildConfig(draft), [draft]);
  const issues = built.ok ? [] : built.issues;
  const visibleIssues = issues.filter((issue) => touched.has(issue.field));
  const config = built.ok ? built.config : null;

  const takenSlugs = listClients()
    .map((client) => client.slug)
    .filter((slug) => slug !== existing?.slug);
  const slugTaken = takenSlugs.includes(draft.slug.trim());

  const initialise = useSession((state) => state.initialise);

  // The preview is the real sheet, driven through the real store, so what is on
  // screen is what the client will see rather than an approximation of it.
  useLayoutEffect(() => {
    if (config) initialise(config, defaultAnswers(config));
  }, [config, initialise]);

  function change(patch: Partial<ClientDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function changeName(clientName: string) {
    setDraft((current) => ({
      ...current,
      clientName,
      slug: slugEdited ? current.slug : slugify(clientName),
    }));
  }

  const fileName = fileNameFor(draft.slug.trim());
  const canSave = config !== null && !slugTaken;

  function handleDownload() {
    if (!config) return;
    downloadText(fileName, serialiseConfig(config));
    setNotice(`Downloaded ${fileName}. Put it in the clients folder and push.`);
  }

  async function handleCopy() {
    if (!config) return;
    const copied = await copyToClipboard(serialiseConfig(config));
    setNotice(
      copied
        ? `Copied. Paste it into clients/${fileName} and push.`
        : 'The browser would not let us copy. Use the download instead.',
    );
  }

  return (
    <main className="builder">
      <div className="builder-form">
        <p className="label-caps text-muted">{existing ? 'Edit a client' : 'New client'}</p>
        <h1 className="font-display mt-2 mb-6 text-3xl tracking-tight">
          {existing ? existing.clientName : 'New client'}
        </h1>

        <fieldset className="builder-fieldset">
          <legend className="builder-legend">The client</legend>

          <label className="builder-field">
            <span>Client name</span>
            <input
              type="text"
              value={draft.clientName}
              maxLength={80}
              autoComplete="off"
              onBlur={() => touch('clientName')}
              onChange={(event) => changeName(event.target.value)}
            />
          </label>
          {issueFor(visibleIssues, 'clientName') && (
            <p className="builder-problem">{issueFor(visibleIssues, 'clientName')}</p>
          )}

          <label className="builder-field">
            <span>Slug, which becomes their link</span>
            <input
              type="text"
              value={draft.slug}
              maxLength={60}
              autoComplete="off"
              onBlur={() => touch('slug')}
              onChange={(event) => {
                setSlugEdited(true);
                change({ slug: event.target.value });
              }}
            />
          </label>
          {issueFor(visibleIssues, 'slug') && (
            <p className="builder-problem">{issueFor(visibleIssues, 'slug')}</p>
          )}
          {slugTaken && (
            <p className="builder-problem">
              A client with the slug {draft.slug.trim()} already exists.
            </p>
          )}

          <label className="builder-field">
            <span>Project line</span>
            <input
              type="text"
              value={draft.projectLine}
              maxLength={120}
              onChange={(event) => change({ projectLine: event.target.value })}
            />
          </label>

          <label className="builder-field">
            <span>Date line</span>
            <input
              type="text"
              value={draft.dateLine}
              maxLength={60}
              onChange={(event) => change({ dateLine: event.target.value })}
            />
          </label>
        </fieldset>

        <fieldset className="builder-fieldset">
          <legend className="builder-legend">The studio block</legend>
          {(
            [
              ['name', 'Studio name'],
              ['website', 'Website'],
              ['social', 'Social handle'],
              ['strapline', 'Strap line'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="builder-field">
              <span>{label}</span>
              <input
                type="text"
                value={draft.studio[key]}
                onChange={(event) =>
                  change({ studio: { ...draft.studio, [key]: event.target.value } })
                }
              />
            </label>
          ))}
        </fieldset>

        <fieldset className="builder-fieldset">
          <legend className="builder-legend">The scale</legend>
          <div className="scale-grid">
            {(
              [
                ['min', 'Lowest'],
                ['max', 'Highest'],
                ['step', 'One key press moves'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="builder-field">
                <span>{label}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft.scale[key]}
                  onBlur={() => touch('scale')}
                  onChange={(event) =>
                    change({ scale: { ...draft.scale, [key]: event.target.value } })
                  }
                />
              </label>
            ))}
          </div>
          {issueFor(visibleIssues, 'scale') && (
            <p className="builder-problem">{issueFor(visibleIssues, 'scale')}</p>
          )}

          <label className="builder-checkbox">
            <input
              type="checkbox"
              checked={draft.scale.snap}
              onChange={(event) =>
                change({ scale: { ...draft.scale, snap: event.target.checked } })
              }
            />
            <span>Make the dot land on those steps when dragged</span>
          </label>
        </fieldset>

        <AxisEditor
          axes={draft.axes}
          issues={visibleIssues}
          onTouch={touch}
          onChange={(axes) => change({ axes })}
        />

        <ThemeEditor
          enabled={draft.useTheme}
          theme={draft.theme}
          onToggle={(useTheme) => change({ useTheme })}
          onChange={(theme) => change({ theme })}
        />

        <div className="builder-save">
          <h2 className="builder-legend">Saving it</h2>

          {canSave ? (
            <>
              <p className="builder-hint">
                This page cannot write to the repository, so save the file yourself. It goes in the
                clients folder, named after its slug, and the site rebuilds when you push.
              </p>
              <ol className="builder-steps">
                <li>
                  Save it as <code>clients/{fileName}</code>
                </li>
                <li>Commit and push. GitHub Actions deploys in about a minute.</li>
                <li>
                  Send the client <code>#/c/{draft.slug.trim()}</code> on the live site.
                </li>
              </ol>
              <div className="notice-actions">
                <button
                  type="button"
                  className="toolbar-button border-note-border rounded-full border"
                  onClick={handleDownload}
                >
                  Download {fileName}
                </button>
                <button type="button" className="toolbar-button" onClick={() => void handleCopy()}>
                  Copy the file
                </button>
              </div>
            </>
          ) : (
            <p className="builder-problem">
              {slugTaken
                ? 'Choose a slug no other client is using.'
                : 'Fill in what is missing above and the file will be ready to save.'}
            </p>
          )}

          <div role="status" aria-live="polite">
            {notice !== null && <p className="builder-hint">{notice}</p>}
          </div>
        </div>

        <p className="mt-8">
          <Link to="/" className="text-muted underline underline-offset-4">
            Back to the list of clients
          </Link>
        </p>
      </div>

      <div className="builder-preview">
        <p className="label-caps text-muted builder-preview-label">Preview</p>
        {config ? (
          <div className="builder-preview-frame" aria-label="Preview of the client's chart">
            <SpectrumSheet config={config} readOnly />
          </div>
        ) : (
          <p className="builder-hint">
            The preview appears once the client has a name, a slug and at least one complete pair.
          </p>
        )}
      </div>
    </main>
  );
}
