/**
 * Detects and extracts information from IC stopped-canister errors (IC0508 / reject code 5).
 */

export interface StoppedCanisterInfo {
  isStopped: boolean;
  canisterId?: string;
}

/**
 * Inspects an error message and detects if it indicates a stopped canister condition.
 * Extracts the canister ID if present.
 */
export function detectStoppedCanister(errorMessage: string): StoppedCanisterInfo {
  if (!errorMessage) {
    return { isStopped: false };
  }

  const lowerMessage = errorMessage.toLowerCase();
  
  // Check for stopped canister indicators
  const isStopped = 
    lowerMessage.includes('ic0508') ||
    lowerMessage.includes('reject code: 5') ||
    lowerMessage.includes('is stopped');

  if (!isStopped) {
    return { isStopped: false };
  }

  // Try to extract canister ID (format: xxxxx-xxxxx-xxxxx-xxxxx-xxx)
  const canisterIdMatch = errorMessage.match(/([a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3})/i);
  const canisterId = canisterIdMatch ? canisterIdMatch[1] : undefined;

  return {
    isStopped: true,
    canisterId,
  };
}

/**
 * Generates a user-friendly explanation for a stopped canister error.
 */
export function getStoppedCanisterExplanation(info: StoppedCanisterInfo): string {
  if (!info.isStopped) {
    return '';
  }

  let explanation = 'The backend canister is stopped, so the Internet Computer is rejecting requests.';
  
  if (info.canisterId) {
    explanation += ` (Canister: ${info.canisterId})`;
  }

  return explanation;
}

/**
 * Generates a suggested action for a stopped canister error.
 */
export function getStoppedCanisterAction(): string {
  return 'Retry deployment to restart the canister, or reset the draft environment for a clean start.';
}

