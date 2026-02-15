import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import PendingChangesDialog from './PendingChangesDialog';
import { useState } from 'react';

export default function OfflineStatusIndicator() {
  const { isOnline } = useOfflineStatus();
  const { isSyncing, pendingCount, syncAll } = useOfflineSync();
  const [showPendingDialog, setShowPendingDialog] = useState(false);

  const handleSyncNow = () => {
    if (isOnline && !isSyncing) {
      syncAll();
    }
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative gap-2"
          >
            {isOnline ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-warning" />
            )}
            <span className="hidden sm:inline text-sm">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1">
                {pendingCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-success" />
              ) : (
                <WifiOff className="h-5 w-5 text-warning" />
              )}
              <div>
                <h4 className="font-semibold">
                  {isOnline ? 'Online Mode' : 'Offline Mode'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {isOnline
                    ? 'Connected to server'
                    : 'Changes will sync when online'}
                </p>
              </div>
            </div>

            {pendingCount > 0 && (
              <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
                <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isOnline
                      ? 'Will sync automatically'
                      : 'Waiting for connection'}
                  </p>
                </div>
              </div>
            )}

            {isSyncing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Syncing changes...</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncNow}
                disabled={!isOnline || isSyncing || pendingCount === 0}
                className="flex-1"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
              {pendingCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPendingDialog(true)}
                  className="flex-1"
                >
                  View Changes
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <PendingChangesDialog
        open={showPendingDialog}
        onOpenChange={setShowPendingDialog}
      />
    </>
  );
}
