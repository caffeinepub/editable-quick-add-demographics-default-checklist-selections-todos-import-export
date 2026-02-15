import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { QueuedOperation } from '../../types/offlineOps';

interface PendingChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PendingChangesDialog({ open, onOpenChange }: PendingChangesDialogProps) {
  const { pendingOps, isSyncing, retryOperation, removeOp, clearAll } = useOfflineSync();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const getOperationLabel = (op: QueuedOperation): string => {
    switch (op.type) {
      case 'createCase':
        return `Create case: ${op.data.patientFirstName} ${op.data.patientLastName}`;
      case 'updateCase':
        return `Update case #${op.caseId}`;
      case 'deleteCase':
        return `Delete case #${op.caseId}`;
      case 'toggleChecklist':
        return `Toggle ${op.field} for case #${op.caseId}`;
      case 'addTodo':
        return `Add to-do: ${op.description}`;
      case 'toggleTodo':
        return `Toggle to-do #${op.todoId}`;
      case 'deleteTodo':
        return `Delete to-do #${op.todoId}`;
      default:
        return 'Unknown operation';
    }
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = async () => {
    await clearAll();
    setShowClearConfirm(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pending Changes</DialogTitle>
            <DialogDescription>
              {pendingOps.length === 0
                ? 'No pending changes to sync'
                : `${pendingOps.length} change${pendingOps.length !== 1 ? 's' : ''} waiting to sync`}
            </DialogDescription>
          </DialogHeader>

          {pendingOps.length > 0 && (
            <>
              <ScrollArea className="max-h-[400px] pr-4">
                <div className="space-y-2">
                  {pendingOps.map((op) => (
                    <div
                      key={op.id}
                      className="flex items-start gap-3 p-3 border rounded-lg bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getOperationLabel(op)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={op.status === 'failed' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {op.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(op.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {op.lastError && (
                          <p className="text-xs text-destructive mt-1 truncate">
                            Error: {op.lastError}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => op.id && retryOperation(op.id)}
                          disabled={isSyncing}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => op.id && removeOp(op.id)}
                          disabled={isSyncing}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={handleClearAll}
                  disabled={isSyncing}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Pending Changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear All Pending Changes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently discard all {pendingOps.length} unsynced change
              {pendingOps.length !== 1 ? 's' : ''}. This action cannot be undone.
              <br />
              <br />
              <strong>Warning:</strong> Any changes made while offline will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear All Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
