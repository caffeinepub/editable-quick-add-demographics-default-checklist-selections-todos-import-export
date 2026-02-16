import { useState } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { performLogoutCleanup } from '../../utils/logoutCleanup';
import { toast } from 'sonner';
import { safeErrorMessage } from '../../utils/safeErrorMessage';

export default function LoginButton() {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in' || isLoggingOut;
  const text = loginStatus === 'logging-in' 
    ? 'Logging in...' 
    : isLoggingOut 
    ? 'Logging out...' 
    : isAuthenticated 
    ? 'Logout' 
    : 'Login';

  const handleAuth = async () => {
    if (isAuthenticated) {
      setIsLoggingOut(true);
      
      try {
        const currentPrincipal = identity.getPrincipal().toString();
        
        // Best-effort cleanup of offline cache and queue
        const cleanupResult = await performLogoutCleanup(currentPrincipal);
        
        // Show warning if cleanup failed (but continue with logout)
        if (!cleanupResult.success) {
          toast.error('Logout cleanup warning', {
            description: cleanupResult.errors.join('; '),
          });
        }

        // Clear all React Query cache (including actor query)
        // Cancel all ongoing queries first
        await queryClient.cancelQueries();
        
        // Remove all queries to ensure clean state
        queryClient.clear();
        
      } catch (error) {
        // Even if cleanup fails, we still want to log out
        console.error('Logout cleanup error:', error);
        toast.error('Logout cleanup failed', {
          description: safeErrorMessage(error),
        });
      } finally {
        // Always clear identity and complete logout
        try {
          await clear();
        } catch (error) {
          console.error('Identity clear error:', error);
        }
        setIsLoggingOut(false);
      }
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <Button
      onClick={handleAuth}
      disabled={disabled}
      variant={isAuthenticated ? 'outline' : 'default'}
      size="sm"
    >
      {text}
    </Button>
  );
}
