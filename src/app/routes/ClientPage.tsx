import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getClientConfig, getCommittedAnswers } from '@/lib/clients';
import { defaultAnswers } from '@/features/session/answers';
import { useSession } from '@/features/session/store';
import { SpectrumSheet } from '@/features/spectrum/SpectrumSheet';
import { NotFoundPage } from './NotFoundPage';

export function ClientPage() {
  const { slug } = useParams<{ slug: string }>();
  const config = getClientConfig(slug);
  const initialise = useSession((state) => state.initialise);

  useEffect(() => {
    if (!config) return;
    // An agreed answers file committed next to the config becomes the starting
    // point, and the thing reset returns to. Otherwise the config's own values do.
    const startingPoint = getCommittedAnswers(config.slug) ?? defaultAnswers(config);
    initialise(config, startingPoint);
  }, [config, initialise]);

  if (!config) return <NotFoundPage title="No such client" />;

  return <SpectrumSheet config={config} readOnly={false} />;
}
