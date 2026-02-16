import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import LoginButton from '../auth/LoginButton';
import OfflineStatusIndicator from '../offline/OfflineStatusIndicator';
import { Button } from '../ui/button';
import { Bug } from 'lucide-react';

interface TopNavProps {
  onDebugToggle?: () => void;
}

export default function TopNav({ onDebugToggle }: TopNavProps) {
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
            {identity && onDebugToggle && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDebugToggle}
                className="gap-2"
              >
                <Bug className="h-4 w-4" />
                <span className="hidden sm:inline">Debug</span>
              </Button>
            )}
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
