import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { ToastViewport, TooltipProvider } from '@/components/ui';

const queryClientOptions = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
};

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient(queryClientOptions));
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={300}>
        <BrowserRouter>
          {children}
          <ToastViewport />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
