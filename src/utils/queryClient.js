import { QueryClient } from '@tanstack/react-query';

// Create a client - export separately to avoid fast refresh issues
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 5 minutes (data is considered fresh for 5 minutes)
      staleTime: 5 * 60 * 1000,
      // Cache time: 10 minutes (data stays in cache for 10 minutes after being unused)
      gcTime: 10 * 60 * 1000,
      // Retry failed requests once
      retry: 1,
      // Refetch on window focus (optional, can disable if not needed)
      refetchOnWindowFocus: false,
    },
  },
});

