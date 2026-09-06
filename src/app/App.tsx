import { HashRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { AppProviders } from './AppProviders';
import { ConnectionBanner } from '../components/layout/ConnectionBanner';

export function App() {
  return (
    <HashRouter>
      <AppProviders>
        <ConnectionBanner />
        <AppRouter />
      </AppProviders>
    </HashRouter>
  );
}
