import { useParams } from 'react-router-dom';
import { getClientConfig } from '@/lib/clients';
import { NotFoundPage } from './NotFoundPage';

export function ClientPage() {
  const { slug } = useParams<{ slug: string }>();
  const config = getClientConfig(slug);

  if (!config) return <NotFoundPage title="No such client" />;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="label-caps text-muted">{config.projectLine}</p>
      <h1 className="font-display mt-2 text-3xl tracking-tight">{config.clientName}</h1>
      <p className="text-muted mt-4">
        {config.axes.length} pairs, scored from {config.scale.min} to {config.scale.max}.
      </p>
    </main>
  );
}
