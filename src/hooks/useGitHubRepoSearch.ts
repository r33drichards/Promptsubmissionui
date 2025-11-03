import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import debounce from 'lodash.debounce';
import githubSearchRepos from 'github-search-repos';

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

async function searchGitHubRepositories(query: string): Promise<GitHubRepo[]> {
  const searchQuery = query.trim();

  try {
    const data: GitHubSearchResponse = await githubSearchRepos(searchQuery, undefined, 'stars');
    return data.items;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('403')) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
      throw new Error(`GitHub API error: ${error.message}`);
    }
    throw error;
  }
}

export function useGitHubRepoSearch() {
  const [debouncedQuery, setDebouncedQuery] = useState('');

  console.log('[useGitHubRepoSearch] debouncedQuery:', debouncedQuery);

  const { data, isLoading, error } = useQuery({
    queryKey: ['githubRepos', debouncedQuery],
    queryFn: () => searchGitHubRepositories(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  console.log('[useGitHubRepoSearch] Query state:', {
    isLoading,
    hasError: !!error,
    dataLength: data?.length || 0,
    enabled: debouncedQuery.trim().length >= 2
  });

  const debouncedSetQuery = useMemo(
    () => debounce((query: string) => {
      console.log('[useGitHubRepoSearch] debouncedSetQuery called with:', query);
      if (query && query.trim().length >= 2) {
        console.log('[useGitHubRepoSearch] Setting debouncedQuery to:', query);
        setDebouncedQuery(query);
      } else {
        console.log('[useGitHubRepoSearch] Clearing debouncedQuery');
        setDebouncedQuery('');
      }
    }, 300),
    []
  );

  const search = (query: string) => {
    console.log('[useGitHubRepoSearch] search called with:', query);
    debouncedSetQuery(query);
  };

  const clear = () => {
    console.log('[useGitHubRepoSearch] clear called');
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
