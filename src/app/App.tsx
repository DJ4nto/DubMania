import { HashRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { AppProviders } from './AppProviders';

export function App() {
  return (
    <HashRouter>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </HashRouter>
  );
}
