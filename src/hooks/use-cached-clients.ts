import { useOptimizedFetch } from './use-optimized-fetch';
import { clientService } from '@/services/client.service';

/**
 * Shared hook for caching client data across components
 * Prevents refetching 1000+ clients on every modal open
 */
export function useCachedClients() {
  return useOptimizedFetch({
    key: 'active-clients-all',
    fetcher: async () => {
      return await clientService.getAll({ status: 'active', limit: 1000 });
    },
    cacheDuration: 300000, // 5 minutes
    deduplicate: true
  });
}
