import { Route, Routes } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { CreateGamePage } from '../pages/CreateGamePage';
import { JoinGamePage } from '../pages/JoinGamePage';
import { LobbyPage } from '../pages/LobbyPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/creer" element={<CreateGamePage />} />
      <Route path="/rejoindre" element={<JoinGamePage />} />
      <Route path="/lobby/:code" element={<LobbyPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
