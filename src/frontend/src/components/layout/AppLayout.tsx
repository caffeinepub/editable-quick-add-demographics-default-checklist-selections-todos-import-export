import { useState, useEffect } from 'react';
import TopNav from './TopNav';
import OfflineSyncListener from '../offline/OfflineSyncListener';
import DebugPanel from '../debug/DebugPanel';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { identity } = useInternetIdentity();
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);

  // Close debug panel when user logs out
  useEffect(() => {
    if (!identity) {
      setDebugPanelOpen(false);
    }
  }, [identity]);

  const handleDebugToggle = () => {
    setDebugPanelOpen((prev) => !prev);
  };

  const handleDebugClose = () => {
    setDebugPanelOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav onDebugToggle={identity ? handleDebugToggle : undefined} />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="border-t py-6 bg-card">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} VetCase Tracker. Built with ❤️ using{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                window.location.hostname
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
      <OfflineSyncListener />
      {identity && debugPanelOpen && <DebugPanel onClose={handleDebugClose} />}
    </div>
  );
}
