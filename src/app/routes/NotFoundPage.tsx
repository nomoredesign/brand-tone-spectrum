import { Link } from 'react-router-dom';

export function NotFoundPage({ title = 'No such page' }: { title?: string }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl tracking-tight">{title}</h1>
      <p className="text-muted mt-4">
        Check the link, or{' '}
        <Link to="/" className="underline underline-offset-4">
          go back to the list of clients
        </Link>
        .
      </p>
    </main>
  );
}
