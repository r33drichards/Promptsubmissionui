import { useQuery } from '@tanstack/react-query';

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

const GITHUB_API_BASE = 'https://api.github.com';

async function fetchGitHubBranches(repo: string): Promise<GitHubBranch[]> {
  if (!repo || !repo.includes('/')) {
    throw new Error('Invalid repository format. Expected "owner/repo"');
  }

  const url = `${GITHUB_API_BASE}/repos/${repo}/branches?per_page=100`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    if (response.status === 404) {
      throw new Error('Repository not found or you do not have access to it.');
    }
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data: GitHubBranch[] = await response.json();
  return data;
}

export function useGitHubBranches(repo: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['githubBranches', repo],
    queryFn: () => fetchGitHubBranches(repo),
    enabled: !!repo && repo.includes('/'),
    staleTime: 2 * 60 * 1000, // 2 minutes - branches change less frequently than we search
    retry: 1,
  });

  return {
    branches: data?.map(b => b.name) ?? [],
    branchData: data ?? [],
    isLoading,
    error: error?.message ?? null,
  };
}
