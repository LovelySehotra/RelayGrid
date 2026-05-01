import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DemoProvider } from './lib/demo-context';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import EventsLog from './pages/EventsLog';
import EventDetail from './pages/EventDetail';
import Sources from './pages/Sources';
import Destinations from './pages/Destinations';
import Settings from './pages/Settings';
import Docs from './pages/Docs';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 20_000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <DemoProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Overview />} />
                <Route path="/events" element={<EventsLog />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/sources" element={<Sources />} />
                <Route path="/destinations" element={<Destinations />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/docs" element={<Docs />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </DemoProvider>
    </QueryClientProvider>
  );
}
