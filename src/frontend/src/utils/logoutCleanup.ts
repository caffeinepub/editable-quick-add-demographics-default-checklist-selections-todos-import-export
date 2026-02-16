import { clearAllCache } from './offlineDb';
import { clearAllOperations } from './offlineQueue';

export interface CleanupResult {
  success: boolean;
  errors: string[];
}

/**
 * Best-effort cleanup of offline cache and queue during logout.
 * Collects errors without throwing so logout can always complete.
 */
export async function performLogoutCleanup(principal: string): Promise<CleanupResult> {
  const errors: string[] = [];

  // Clear offline cache (best-effort)
  try {
    await clearAllCache();
  } catch (error) {
    errors.push(`Failed to clear offline cache: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Clear operation queue (best-effort)
  try {
    await clearAllOperations(principal);
  } catch (error) {
    errors.push(`Failed to clear operation queue: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
