import { HashRouter, Route, Routes } from 'react-router-dom';
import { IndexPage } from './routes/IndexPage';
import { ClientPage } from './routes/ClientPage';
import { NotFoundPage } from './routes/NotFoundPage';

/**
 * Hash routing, because GitHub Pages has no way to rewrite a deep path back to
 * index.html. With `#/c/carnot-ai` the server only ever sees `/`.
 */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/c/:slug" element={<ClientPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  );
}
