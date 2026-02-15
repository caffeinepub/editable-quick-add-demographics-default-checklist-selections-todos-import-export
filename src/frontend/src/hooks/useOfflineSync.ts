import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { useOfflineStatus } from './useOfflineStatus';
import {
  getPendingOperations,
  updateOperationStatus,
  removeOperation,
  clearAllOperations,
} from '../utils/offlineQueue';
import type { QueuedOperation } from '../types/offlineOps';
import { toast } from 'sonner';

export function useOfflineSync() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const { isOnline } = useOfflineStatus();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOps, setPendingOps] = useState<QueuedOperation[]>([]);

  const principal = identity?.getPrincipal().toString();

  const loadPendingOps = useCallback(async () => {
    if (!principal) return;
    const ops = await getPendingOperations(principal);
    setPendingOps(ops);
  }, [principal]);

  useEffect(() => {
    loadPendingOps();
  }, [loadPendingOps]);

  const syncOperation = async (op: QueuedOperation): Promise<boolean> => {
    if (!actor || !op.id) return false;

    try {
      switch (op.type) {
        case 'createCase': {
          await actor.createCase(
            op.data.mrn,
            op.data.patientFirstName,
            op.data.patientLastName,
            op.data.dateOfBirth,
            op.data.species,
            op.data.breed,
            op.data.sex,
            op.data.presentingComplaint,
            op.data.arrivalDate,
            op.data.dischargeNotesComplete,
            op.data.pdvmNotified,
            op.data.labsComplete,
            op.data.histoComplete,
            op.data.surgeryReportComplete,
            op.data.imagingComplete,
            op.data.cultureComplete,
            op.data.notes,
            []
          );
          break;
        }
        case 'updateCase': {
          await actor.updateCase(
            op.caseId,
            op.data.mrn,
            op.data.patientFirstName,
            op.data.patientLastName,
            op.data.dateOfBirth,
            op.data.arrivalDate,
            op.data.species,
            op.data.breed,
            op.data.sex,
            op.data.presentingComplaint,
            op.data.dischargeNotesComplete,
            op.data.pdvmNotified,
            op.data.labsComplete,
            op.data.histoComplete,
            op.data.surgeryReportComplete,
            op.data.imagingComplete,
            op.data.cultureComplete,
            op.data.notes,
            op.todos
          );
          break;
        }
        case 'deleteCase': {
          await actor.deleteCase(op.caseId);
          break;
        }
        case 'toggleChecklist': {
          const methodMap = {
            dischargeNotes: 'toggleDischargeNotes',
            pdvmNotified: 'togglePdvmNotified',
            labs: 'toggleLabs',
            histo: 'toggleHisto',
            surgeryReport: 'toggleSurgeryReport',
            imaging: 'toggleImaging',
            culture: 'toggleCulture',
          };
          const method = methodMap[op.field];
          await (actor as any)[method](op.caseId);
          break;
        }
        case 'addTodo': {
          await actor.addTodoItem(op.caseId, op.description);
          break;
        }
        case 'toggleTodo': {
          await actor.toggleTodoComplete(op.caseId, op.todoId);
          break;
        }
        case 'deleteTodo': {
          await actor.deleteTodoItem(op.caseId, op.todoId);
          break;
        }
      }

      await updateOperationStatus(op.id, 'succeeded');
      await removeOperation(op.id);
      return true;
    } catch (error: any) {
      console.error('Sync error:', error);
      await updateOperationStatus(op.id, 'failed', error.message || 'Unknown error');
      return false;
    }
  };

  const syncAll = useCallback(async () => {
    if (!actor || !principal || !isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const ops = await getPendingOperations(principal);
      if (ops.length === 0) {
        setIsSyncing(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const op of ops) {
        const success = await syncOperation(op);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      await loadPendingOps();

      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['cases'] });
        toast.success(`Synced ${successCount} change(s)`);
      }

      if (failCount > 0) {
        toast.error(`Failed to sync ${failCount} change(s)`);
      }
    } catch (error) {
      console.error('Sync all error:', error);
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [actor, principal, isOnline, isSyncing, loadPendingOps, queryClient]);

  const retryOperation = useCallback(
    async (opId: number) => {
      if (!actor) return;
      const op = pendingOps.find((o) => o.id === opId);
      if (!op) return;

      const success = await syncOperation(op);
      await loadPendingOps();

      if (success) {
        queryClient.invalidateQueries({ queryKey: ['cases'] });
        toast.success('Change synced successfully');
      } else {
        toast.error('Failed to sync change');
      }
    },
    [actor, pendingOps, loadPendingOps, queryClient]
  );

  const removeOp = useCallback(
    async (opId: number) => {
      await removeOperation(opId);
      await loadPendingOps();
      toast.success('Pending change removed');
    },
    [loadPendingOps]
  );

  const clearAll = useCallback(async () => {
    if (!principal) return;
    await clearAllOperations(principal);
    await loadPendingOps();
    toast.success('All pending changes cleared');
  }, [principal, loadPendingOps]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && actor && pendingOps.length > 0 && !isSyncing) {
      syncAll();
    }
  }, [isOnline, actor, pendingOps.length]);

  return {
    isSyncing,
    pendingOps,
    pendingCount: pendingOps.length,
    syncAll,
    retryOperation,
    removeOp,
    clearAll,
    loadPendingOps,
  };
}
