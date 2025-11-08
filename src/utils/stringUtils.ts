/**
 * Truncates a branch name to a maximum length while preserving important parts
 * @param branchName - The branch name to truncate
 * @param maxLength - Maximum length (default: 45)
 * @returns Truncated branch name with ellipsis if needed
 */
export function truncateBranchName(
  branchName: string,
  maxLength: number = 45
): string {
  if (branchName.length <= maxLength) {
    return branchName;
  }

  // Calculate how many characters to keep from start and end
  // Reserve 3 characters for ellipsis
  const ellipsis = '...';
  const availableLength = maxLength - ellipsis.length;

  // Keep more from the start (2/3) to preserve the meaningful part
  const startLength = Math.ceil(availableLength * 0.65);
  const endLength = availableLength - startLength;

  const start = branchName.slice(0, startLength);
  const end = branchName.slice(-endLength);

  return `${start}${ellipsis}${end}`;
}
