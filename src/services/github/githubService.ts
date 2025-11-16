/**
 * GitHub API Service
 *
 * Provides functions to interact with GitHub API for fetching PR information.
 * Uses the GitHub REST API without authentication (public repos only).
 */

interface PullRequest {
  number: number;
  state: 'open' | 'closed';
  merged_at: string | null;
  html_url: string;
  title: string;
  head: {
    ref: string;
  };
  base: {
    ref: string;
  };
}

export type PrStatus = 'open' | 'closed' | 'merged';

export interface PrInfo {
  status: PrStatus;
  prUrl: string;
  prNumber: number;
  title: string;
}

/**
 * Fetches the PR status for a given repository and branch
 * @param repo - Repository in format "owner/repo"
 * @param branch - Branch name to check for PR
 * @param targetBranch - Target branch (usually 'main' or 'master')
 * @returns PR information if found, null otherwise
 */
export async function fetchPrStatus(
  repo: string,
  branch: string,
  targetBranch: string
): Promise<PrInfo | null> {
  try {
    const [owner, repoName] = repo.split('/');

    if (!owner || !repoName) {
      console.error('[GitHubService] Invalid repo format:', repo);
      return null;
    }

    // Fetch all pull requests for the head branch
    const url = `https://api.github.com/repos/${owner}/${repoName}/pulls?head=${owner}:${branch}&base=${targetBranch}&state=all`;

    console.log('[GitHubService] Fetching PR status from:', url);

    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        // Add GitHub token from environment if available (for higher rate limits)
        ...(import.meta.env.VITE_GITHUB_TOKEN && {
          Authorization: `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`,
        }),
      },
    });

    if (!response.ok) {
      console.error(
        '[GitHubService] GitHub API error:',
        response.status,
        response.statusText
      );
      return null;
    }

    const pullRequests: PullRequest[] = await response.json();

    if (pullRequests.length === 0) {
      console.log('[GitHubService] No PRs found for branch:', branch);
      return null;
    }

    // Get the most recent PR (first in the list)
    const pr = pullRequests[0];

    // Determine the status
    let status: PrStatus;
    if (pr.merged_at) {
      status = 'merged';
    } else if (pr.state === 'open') {
      status = 'open';
    } else {
      status = 'closed';
    }

    console.log('[GitHubService] Found PR:', {
      number: pr.number,
      status,
      url: pr.html_url,
      title: pr.title,
    });

    return {
      status,
      prUrl: pr.html_url,
      prNumber: pr.number,
      title: pr.title,
    };
  } catch (error) {
    console.error('[GitHubService] Error fetching PR status:', error);
    return null;
  }
}

/**
 * Checks if a PR exists for the given branch
 * @param repo - Repository in format "owner/repo"
 * @param branch - Branch name to check
 * @param targetBranch - Target branch
 * @returns true if PR exists, false otherwise
 */
export async function checkPrExists(
  repo: string,
  branch: string,
  targetBranch: string
): Promise<boolean> {
  const prInfo = await fetchPrStatus(repo, branch, targetBranch);
  return prInfo !== null;
}
