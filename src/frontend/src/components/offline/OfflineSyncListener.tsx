import { useEffect } from 'react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export default function OfflineSyncListener() {
  const { loadPendingOps } = useOfflineSync();

  useEffect(() => {
    loadPendingOps();
  }, [loadPendingOps]);

  return null;
}
