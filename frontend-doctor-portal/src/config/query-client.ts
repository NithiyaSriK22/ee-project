import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
      staleTime: 1000 * 15, // 15 seconds for fast clinical queue updates
    },
    mutations: {
      retry: 1,
    },
  },
});
