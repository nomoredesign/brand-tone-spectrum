import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ClientConfig } from '@shared/schema';
import { listClients } from '@/lib/clients';
import { isSubmitConfigured } from '@/lib/env';
import { RemoveClientDialog } from '@/features/clients/RemoveClientDialog';

/** The studio's own list of clients. Deliberately plain: no client ever sees it. */
export function IndexPage() {
  const clients = listClients();
  const [removing, setRemoving] = useState<ClientConfig | null>(null);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="label-caps text-muted">Nomoredesign</p>
      <h1 className="font-display mt-2 text-3xl tracking-tight">Brand Tone Spectrum</h1>

      <p className="mt-8">
        <Link
          to="/new"
          className="toolbar-button border-note-border inline-block rounded-full border"
        >
          New client
        </Link>
      </p>

      {clients.length === 0 ? (
        <p className="text-muted mt-8">
          No clients yet. Start one with the button above, or copy
          <code className="mx-1">clients/_template.json</code> by hand.
        </p>
      ) : (
        <ul className="border-rule mt-8 border-t">
          {clients.map((client) => (
            <li key={client.slug} className="border-rule border-b py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <Link
                  to={`/c/${client.slug}`}
                  className="text-lg underline-offset-4 hover:underline"
                >
                  {client.clientName}
                </Link>
                <span className="label-caps text-muted">{client.dateLine}</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                <Link to={`/edit/${client.slug}`} className="toolbar-button">
                  Edit
                </Link>
                <Link to={`/c/${client.slug}?present=1`} className="toolbar-button">
                  Present
                </Link>
                <button
                  type="button"
                  className="toolbar-button"
                  onClick={() => setRemoving(client)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isSubmitConfigured && (
        <p className="mt-10">
          <Link to="/inbox" className="text-muted underline underline-offset-4">
            Submissions inbox
          </Link>
        </p>
      )}

      <RemoveClientDialog client={removing} onClose={() => setRemoving(null)} />
    </main>
  );
}
