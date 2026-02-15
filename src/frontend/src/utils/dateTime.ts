/**
 * Converts a backend Time (bigint nanoseconds) to a human-readable date string
 */
export function formatDate(time: bigint): string {
  const milliseconds = Number(time / BigInt(1_000_000));
  const date = new Date(milliseconds);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Gets today's date as a string in YYYY-MM-DD format for HTML date inputs
 */
export function getTodayDateString(): string {
  const today = new Date();
  return dateToString(today);
}

/**
 * Converts a Date object to YYYY-MM-DD string
 */
export function dateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts an HTML date input string (YYYY-MM-DD) to backend Time (bigint nanoseconds)
 */
export function dateStringToTime(dateString: string): bigint {
  const date = new Date(dateString + 'T00:00:00.000Z');
  const milliseconds = date.getTime();
  return BigInt(milliseconds) * BigInt(1_000_000);
}

/**
 * Converts backend Time (bigint nanoseconds) to HTML date input string (YYYY-MM-DD)
 */
export function timeToDateString(time: bigint): string {
  const milliseconds = Number(time / BigInt(1_000_000));
  const date = new Date(milliseconds);
  return dateToString(date);
}
