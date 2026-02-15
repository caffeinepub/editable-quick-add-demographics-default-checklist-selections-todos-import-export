import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import LoginButton from '../auth/LoginButton';
import OfflineStatusIndicator from '../offline/OfflineStatusIndicator';

export default function TopNav() {
  const { identity } = useInternetIdentity();

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              VetCase Tracker
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {identity && <OfflineStatusIndicator />}
            {identity && (
              <div className="hidden sm:block text-sm text-muted-foreground">
                {identity.getPrincipal().toString().slice(0, 8)}...
              </div>
            )}
            <LoginButton />
          </div>
        </div>
      </div>
    </header>
  );
}
