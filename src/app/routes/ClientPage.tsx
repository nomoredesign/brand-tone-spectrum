import { useCallback, useLayoutEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { Answers, ClientConfig } from '@shared/schema';
import { getClientConfig, getCommittedAnswers } from '@/lib/clients';
import { decodeAnswers } from '@/lib/encoding';
import { Notice } from '@/components/Notice';
import { defaultAnswers } from '@/features/session/answers';
import { describeMergeReport, importAnswers, mergeAnswers } from '@/features/session/merge';
import { loadAnswers } from '@/features/session/storage';
import { useSession } from '@/features/session/store';
import { useAutosave } from '@/features/session/useAutosave';
import { useFileDrop } from '@/features/session/useFileDrop';
import { readJsonFile } from '@/features/session/transfer';
import { Toolbar } from '@/features/session/Toolbar';
import { LinkPrompt } from '@/features/session/LinkPrompt';
import { SpectrumSheet } from '@/features/spectrum/SpectrumSheet';
import { NotFoundPage } from './NotFoundPage';

/** Two sets of answers are the same when every value and every note matches. */
function sameAnswers(a: Answers, b: Answers): boolean {
  const keys = new Set([
    ...Object.keys(a.values),
    ...Object.keys(b.values),
    ...Object.keys(a.notes),
    ...Object.keys(b.notes),
  ]);

  for (const key of keys) {
    if (a.values[key] !== b.values[key]) return false;
    if ((a.notes[key] ?? '') !== (b.notes[key] ?? '')) return false;
  }
  return true;
}

/** Lines any set of answers up against the config, whatever it came from. */
function align(config: ClientConfig, answers: Answers | undefined): Answers | undefined {
  return answers === undefined ? undefined : mergeAnswers(config, answers).answers;
}

type Resolution = {
  /** Where reset returns to. */
  startingPoint: Answers;
  /** What the page opens with. */
  current: Answers;
  /** Set when a link and the browser disagree, and the person has to choose. */
  fromLink: Answers | null;
};

/**
 * Works out what the page should open with, in one place and exactly once per
 * visit. The order matters: anything saved in this browser beats a committed
 * answers file, which beats the config's own starting values.
 */
function resolveStart(config: ClientConfig, token: string): Resolution {
  const startingPoint = getCommittedAnswers(config.slug) ?? defaultAnswers(config);
  const stored = align(config, loadAnswers(config.slug));

  const decoded = token.length > 0 ? decodeAnswers(token) : undefined;
  const fromLink =
    decoded !== undefined && decoded.slug === config.slug ? align(config, decoded) : undefined;

  // A link must never quietly replace work already in this browser.
  if (fromLink && stored && !sameAnswers(stored, fromLink)) {
    return { startingPoint, current: stored, fromLink };
  }

  return {
    startingPoint,
    current: fromLink ?? stored ?? startingPoint,
    fromLink: null,
  };
}

export function ClientPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const config = getClientConfig(slug);
  const token = searchParams.get('a') ?? '';

  if (!config) return <NotFoundPage title="No such client" />;

  // A different client or a different link is a different session, so it gets a
  // fresh mount rather than a tangle of effects putting the old one right.
  return <ClientSheet key={`${config.slug}:${token}`} config={config} token={token} />;
}

function ClientSheet({ config, token }: { config: ClientConfig; token: string }) {
  const [searchParams] = useSearchParams();
  // `?present=1` may sit before the hash, which is where a person would write it.
  const present =
    searchParams.get('present') === '1' ||
    new URLSearchParams(window.location.search).get('present') === '1';

  const [resolution] = useState(() => resolveStart(config, token));
  const [linkDecided, setLinkDecided] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const initialise = useSession((state) => state.initialise);
  const replaceAll = useSession((state) => state.replaceAll);
  const ready = useSession((state) => state.initialised && state.config?.slug === config.slug);

  // Before paint, so switching client never shows the previous one's answers.
  useLayoutEffect(() => {
    initialise(config, resolution.startingPoint, resolution.current);
  }, [config, resolution, initialise]);

  useAutosave(config.slug, !present);

  const handleFile = useCallback(
    (file: File) => {
      void readJsonFile(file)
        .then((raw) => {
          const result = importAnswers(config, raw);
          if (!result.ok) {
            setNotice(result.reason);
            return;
          }

          replaceAll(result.report.answers);
          const mismatch = describeMergeReport(result.report, config);
          setNotice(mismatch ? `Answers loaded. ${mismatch}` : 'Answers loaded.');
        })
        .catch(() => {
          setNotice('That file could not be read. It should be a JSON file from this tool.');
        });
    },
    [config, replaceAll],
  );

  const isDraggingFile = useFileDrop(!present, handleFile);
  const pendingLink = linkDecided ? null : resolution.fromLink;

  if (!ready) return null;

  return (
    <div className={isDraggingFile ? 'drop-target' : undefined}>
      <SpectrumSheet config={config} readOnly={present} />

      {!present && (
        <>
          <div className="notice-region" role="status" aria-live="polite">
            {pendingLink !== null && (
              <LinkPrompt
                onKeepMine={() => {
                  setLinkDecided(true);
                  setNotice('Kept the answers already in your browser.');
                }}
                onUseLink={() => {
                  replaceAll(pendingLink);
                  setLinkDecided(true);
                  setNotice('Now showing the answers from the link.');
                }}
              />
            )}
            <Notice message={notice} onDismiss={() => setNotice(null)} />
          </div>

          <Toolbar config={config} onMessage={setNotice} onFileChosen={handleFile} />
        </>
      )}
    </div>
  );
}
