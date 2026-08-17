import { Link } from 'react-router-dom';
import { listClients } from '@/lib/clients';
import { isSubmitConfigured } from '@/lib/env';

/** The studio's own list of clients. Deliberately plain: no client ever sees it. */
export function IndexPage() {
  const clients = listClients();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="label-caps text-muted">Nomoredesign</p>
      <h1 className="font-display mt-2 text-3xl tracking-tight">Brand Tone Spectrum</h1>

      {clients.length === 0 ? (
        <p className="text-muted mt-8">
          No client files yet. Copy <code>clients/_template.json</code> to get started.
        </p>
      ) : (
        <ul className="border-rule mt-10 border-t">
          {clients.map((client) => (
            <li key={client.slug} className="border-rule border-b">
              <Link
                to={`/c/${client.slug}`}
                className="hover:bg-note/40 flex items-baseline justify-between gap-4 py-4"
              >
                <span className="text-lg">{client.clientName}</span>
                <span className="label-caps text-muted">{client.dateLine}</span>
              </Link>
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
    </main>
  );
}
