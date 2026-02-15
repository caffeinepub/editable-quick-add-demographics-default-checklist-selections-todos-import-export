import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import LoginButton from '../auth/LoginButton';
import { Stethoscope } from 'lucide-react';

export default function TopNav() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold">VetCase Tracker</h1>
              <p className="text-xs text-muted-foreground">Surgery Case Management</p>
            </div>
          </button>

          <div className="flex items-center gap-4">
            {identity && (
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium">Veterinarian</p>
                <p className="text-xs text-muted-foreground">{identity.getPrincipal().toString().slice(0, 8)}...</p>
              </div>
            )}
            <LoginButton />
          </div>
        </div>
      </div>
    </header>
  );
}
