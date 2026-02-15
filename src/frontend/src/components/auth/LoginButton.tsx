import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';
import { clearAllCache } from '../../utils/offlineDb';
import { clearAllOperations } from '../../utils/offlineQueue';

export default function LoginButton() {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';
  const text = loginStatus === 'logging-in' ? 'Logging in...' : isAuthenticated ? 'Logout' : 'Login';

  const handleAuth = async () => {
    if (isAuthenticated) {
      const principal = identity.getPrincipal().toString();
      await clear();
      queryClient.clear();
      // Clear offline cache and queue
      await clearAllCache();
      if (principal) {
        await clearAllOperations(principal);
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
      {isAuthenticated ? (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          {text}
        </>
      ) : (
        <>
          <LogIn className="mr-2 h-4 w-4" />
          {text}
        </>
      )}
    </Button>
  );
}
