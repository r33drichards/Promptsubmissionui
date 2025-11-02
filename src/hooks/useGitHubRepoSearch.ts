import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import debounce from 'lodash.debounce';

export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: {
    login: string;
  };
  description: string | null;
  html_url: string;
  stargazers_count: number;
}

interface GitHubSearchResponse {
  items: GitHubRepo[];
  total_count: number;
}

const GITHUB_API_BASE = 'https://api.github.com';

async function searchGitHubRepositories(query: string): Promise<GitHubRepo[]> {
  const searchQuery = encodeURIComponent(query.trim());
  const url = `${GITHUB_API_BASE}/search/repositories?q=${searchQuery}&sort=stars&order=desc&per_page=20`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data: GitHubSearchResponse = await response.json();
  return data.items;
}

export function useGitHubRepoSearch() {
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['githubRepos', debouncedQuery],
    queryFn: () => searchGitHubRepositories(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const debouncedSetQuery = useMemo(
    () => debounce((query: string) => {
      if (query && query.trim().length >= 2) {
        setDebouncedQuery(query);
      } else {
        setDebouncedQuery('');
      }
    }, 300),
    []
  );

  const search = (query: string) => {
    debouncedSetQuery(query);
  };

  const clear = () => {
    debouncedSetQuery.cancel();
    setDebouncedQuery('');
  };

  return {
    repos: data ?? [],
    isLoading,
    error: error?.message ?? null,
    search,
    clear,
  };
}
