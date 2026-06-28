import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { App } from './App';
import { WalletProvider } from './lib/wallet';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initAnalytics } from './lib/analytics';
import './index.css';

void initAnalytics();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 2 },
  },
});

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={basename}>
          <WalletProvider>
            <App />
            <Toaster
              theme="dark"
              position="bottom-center"
              toastOptions={{
                style: {
                  background: '#110f22',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#eceaff',
                },
              }}
            />
          </WalletProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
