/**
 * Converts unknown thrown values (Error, string, objects) into a safe English string
 * for displaying errors in the UI.
 */
export function safeErrorMessage(error: unknown): string {
  if (!error) {
    return 'Unknown error occurred';
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message || 'Unknown error occurred';
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle objects with message property
  if (typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }

  // Handle objects with error property
  if (typeof error === 'object' && 'error' in error) {
    const err = (error as { error: unknown }).error;
    if (typeof err === 'string') {
      return err;
    }
  }

  // Fallback: try to stringify
  try {
    const stringified = JSON.stringify(error);
    if (stringified && stringified !== '{}') {
      return stringified;
    }
  } catch {
    // JSON.stringify failed
  }

  return 'Unknown error occurred';
}
