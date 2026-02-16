import { useEffect, useRef } from 'react';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Hook that automatically provisions the #user role for new users after login.
 * Retries until actor is ready, with bounded retry window.
 */
export function useEnsureUserRoleProvisioning() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  
  const provisionedPrincipalRef = useRef<string | null>(null);
  const isProvisioningRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  // Configuration
  const MAX_RETRIES = 20;
  const MAX_ELAPSED_MS = 30000; // 30 seconds
  const RETRY_INTERVAL_MS = 500; // 500ms between retries

  useEffect(() => {
    const provisionRole = async () => {
      // Clear any pending retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // No identity means user is logged out
      if (!identity) {
        return;
      }

      const currentPrincipal = identity.getPrincipal().toString();
      
      // Skip if already provisioned this principal in this session
      if (provisionedPrincipalRef.current === currentPrincipal) {
        return;
      }

      // Initialize start time on first attempt for this principal
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        retryCountRef.current = 0;
      }

      // Check if we've exceeded retry limits
      const elapsedMs = Date.now() - startTimeRef.current;
      if (retryCountRef.current >= MAX_RETRIES || elapsedMs >= MAX_ELAPSED_MS) {
        // Show error only once
        if (!isProvisioningRef.current) {
          toast.error('Unable to set up your account permissions. Please try logging out and back in.', {
            description: 'The system took too long to initialize.',
          });
        }
        // Reset for next attempt
        startTimeRef.current = null;
        retryCountRef.current = 0;
        return;
      }

      // If actor is not ready yet, schedule a retry
      if (!actor || actorFetching) {
        retryCountRef.current++;
        retryTimeoutRef.current = setTimeout(() => {
          provisionRole();
        }, RETRY_INTERVAL_MS);
        return;
      }

      // Prevent concurrent provisioning attempts
      if (isProvisioningRef.current) {
        return;
      }

      try {
        isProvisioningRef.current = true;
        
        // Call backend to ensure user has the #user role
        await actor.ensureUserRole();
        
        // Mark this principal as provisioned
        provisionedPrincipalRef.current = currentPrincipal;
        
        // Reset retry tracking
        startTimeRef.current = null;
        retryCountRef.current = 0;
        
        // Invalidate case queries so they refresh with proper permissions
        queryClient.invalidateQueries({ queryKey: ['cases'] });
        queryClient.invalidateQueries({ queryKey: ['case'] });
        
      } catch (error: any) {
        console.error('Failed to provision user role:', error);
        
        // Show user-friendly error message
        toast.error('Unable to set up your account permissions. Please try again.', {
          description: error?.message || 'An unexpected error occurred',
        });
        
        // Reset retry tracking on error
        startTimeRef.current = null;
        retryCountRef.current = 0;
      } finally {
        isProvisioningRef.current = false;
      }
    };

    provisionRole();

    // Cleanup function to clear any pending retries
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [identity, actor, actorFetching, queryClient]);

  // Reset all state when identity changes (logout/login)
  useEffect(() => {
    if (!identity) {
      provisionedPrincipalRef.current = null;
      startTimeRef.current = null;
      retryCountRef.current = 0;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    }
  }, [identity]);
}
