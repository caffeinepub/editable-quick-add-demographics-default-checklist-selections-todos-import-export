import type { SurgeryCase } from '../backend';

/**
 * Finds the most recent case for a given MRN from a list of cases.
 * Returns the case with the greatest arrivalDate; if tied, uses the greatest id.
 * Returns null if no matching case is found or if MRN is empty/whitespace.
 */
export function findMostRecentCaseByMRN(
  mrn: string,
  cases: SurgeryCase[]
): SurgeryCase | null {
  const trimmedMRN = mrn.trim();
  
  if (!trimmedMRN) {
    return null;
  }

  const matchingCases = cases.filter(
    (c) => c.mrn.trim().toLowerCase() === trimmedMRN.toLowerCase()
  );

  if (matchingCases.length === 0) {
    return null;
  }

  // Sort by arrivalDate descending, then by id descending
  const sorted = [...matchingCases].sort((a, b) => {
    // Compare arrivalDate first (most recent first)
    if (a.arrivalDate > b.arrivalDate) return -1;
    if (a.arrivalDate < b.arrivalDate) return 1;
    
    // If arrivalDate is equal, compare by id (greatest first)
    if (a.id > b.id) return -1;
    if (a.id < b.id) return 1;
    
    return 0;
  });

  return sorted[0];
}
