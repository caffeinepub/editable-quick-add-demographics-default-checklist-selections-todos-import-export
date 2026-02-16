import { useRef, useEffect, useState } from 'react';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';

export interface ProvisioningStatus {
  state: 'idle' | 'running' | 'succeeded' | 'failed' | 'timeout';
  retryCount: number;
  lastError: string | null;
  elapsedMs: number;
}

/**
 * Hook that exposes the provisioning status for debugging purposes.
 * This mirrors the logic in useEnsureUserRoleProvisioning but only reads state.
 */
export function useProvisioningStatus(): ProvisioningStatus {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  
  const [status, setStatus] = useState<ProvisioningStatus>({
    state: 'idle',
    retryCount: 0,
    lastError: null,
    elapsedMs: 0,
  });

  const provisionedPrincipalRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  const MAX_RETRIES = 20;
  const MAX_ELAPSED_MS = 30000;

  useEffect(() => {
    if (!identity) {
      setStatus({
        state: 'idle',
        retryCount: 0,
        lastError: null,
        elapsedMs: 0,
      });
      provisionedPrincipalRef.current = null;
      startTimeRef.current = null;
      retryCountRef.current = 0;
      return;
    }

    const currentPrincipal = identity.getPrincipal().toString();
    
    // Already provisioned
    if (provisionedPrincipalRef.current === currentPrincipal) {
      setStatus({
        state: 'succeeded',
        retryCount: retryCountRef.current,
        lastError: null,
        elapsedMs: startTimeRef.current ? Date.now() - startTimeRef.current : 0,
      });
      return;
    }

    // Initialize start time
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      retryCountRef.current = 0;
    }

    const elapsedMs = Date.now() - startTimeRef.current;

    // Check timeout
    if (retryCountRef.current >= MAX_RETRIES || elapsedMs >= MAX_ELAPSED_MS) {
      setStatus({
        state: 'timeout',
        retryCount: retryCountRef.current,
        lastError: 'Provisioning timed out after 30 seconds',
        elapsedMs,
      });
      return;
    }

    // Waiting for actor
    if (!actor || actorFetching) {
      retryCountRef.current++;
      setStatus({
        state: 'running',
        retryCount: retryCountRef.current,
        lastError: null,
        elapsedMs,
      });
      return;
    }

    // Actor ready, provisioning should succeed soon
    setStatus({
      state: 'running',
      retryCount: retryCountRef.current,
      lastError: null,
      elapsedMs,
    });

    // Listen for successful provisioning
    const checkInterval = setInterval(() => {
      if (provisionedPrincipalRef.current === currentPrincipal) {
        setStatus({
          state: 'succeeded',
          retryCount: retryCountRef.current,
          lastError: null,
          elapsedMs: startTimeRef.current ? Date.now() - startTimeRef.current : 0,
        });
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [identity, actor, actorFetching]);

  return status;
}
