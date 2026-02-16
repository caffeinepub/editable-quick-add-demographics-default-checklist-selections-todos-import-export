import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';

export interface CallerRoleDebugData {
  role: 'admin' | 'user' | 'guest' | 'error';
  error?: string;
}

/**
 * Hook that fetches the caller's role from the backend for debugging purposes.
 * Supports conditional polling when the debug panel is open.
 */
export function useCallerRoleDebug(enabled: boolean) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<CallerRoleDebugData>({
    queryKey: ['debugRole'],
    queryFn: async () => {
      if (!actor) {
        return { role: 'error', error: 'Actor not available' };
      }

      try {
        const roleText = await actor.debugGetRole();
        
        if (roleText === 'admin' || roleText === 'user' || roleText === 'guest') {
          return { role: roleText };
        }
        
        return { role: 'error', error: `Unknown role: ${roleText}` };
      } catch (error: any) {
        return { 
          role: 'error', 
          error: error?.message || 'Failed to fetch role' 
        };
      }
    },
    enabled: enabled && !!actor && !actorFetching && !!identity,
    refetchInterval: enabled ? 1000 : false, // Poll every 1s when enabled
    retry: false,
  });
}
