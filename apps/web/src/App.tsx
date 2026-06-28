import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';

const named = <T extends Record<string, React.ComponentType>>(loader: () => Promise<T>, key: keyof T) =>
  lazy(() => loader().then((m) => ({ default: m[key] })));

const Landing = named(() => import('./pages/Landing'), 'Landing');
const Docs = named(() => import('./pages/Docs'), 'Docs');
const NotFound = named(() => import('./pages/NotFound'), 'NotFound');
const Browse = named(() => import('./pages/Browse'), 'Browse');
const EventDetail = named(() => import('./pages/EventDetail'), 'EventDetail');
const MyTickets = named(() => import('./pages/MyTickets'), 'MyTickets');
const Market = named(() => import('./pages/Market'), 'Market');
const Organize = named(() => import('./pages/Organize'), 'Organize');
const Scan = named(() => import('./pages/Scan'), 'Scan');
const Badges = named(() => import('./pages/Badges'), 'Badges');
const Analytics = named(() => import('./pages/Analytics'), 'Analytics');
const Settings = named(() => import('./pages/Settings'), 'Settings');

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Browse />} />
        <Route path="event/:id" element={<EventDetail />} />
        <Route path="tickets" element={<MyTickets />} />
        <Route path="market" element={<Market />} />
        <Route path="organize" element={<Organize />} />
        <Route path="scan" element={<Scan />} />
        <Route path="badges" element={<Badges />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
