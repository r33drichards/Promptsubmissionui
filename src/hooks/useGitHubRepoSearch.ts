import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import debounce from 'lodash.debounce';
import { useApi } from '../providers/ApiProvider';
import { GitHubRepository } from '../services/api/types';

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

// Convert GitHubRepository to GitHubRepo for backward compatibility
function convertToGitHubRepo(repo: GitHubRepository): GitHubRepo {
  return {
    id: repo.id,
    full_name: repo.full_name,
    name: repo.name,
    owner: repo.owner,
    description: repo.description,
    html_url: repo.html_url,
    stargazers_count: repo.stargazers_count,
  };
}

export function useGitHubRepoSearch() {
  const api = useApi();
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['githubRepos', debouncedQuery],
    queryFn: async () => {
      // Search the authenticated user's repositories via the backend
      const repos = await api.github.searchRepositories(
        debouncedQuery.trim().length >= 2 ? debouncedQuery : undefined
      );
      return repos.map(convertToGitHubRepo);
    },
    enabled: true, // Always enabled - backend will return user's repos
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
