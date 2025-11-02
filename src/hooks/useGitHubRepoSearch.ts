import { useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

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

interface UseGitHubRepoSearchResult {
  repos: GitHubRepo[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

const GITHUB_API_BASE = 'https://api.github.com';

async function searchGitHubRepositories(query: string, signal?: AbortSignal): Promise<GitHubRepo[]> {
  const searchQuery = encodeURIComponent(query.trim());
  const url = `${GITHUB_API_BASE}/search/repositories?q=${searchQuery}&sort=stars&order=desc&per_page=20`;

  const response = await fetch(url, {
    signal,
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

export function useGitHubRepoSearch(): UseGitHubRepoSearchResult {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: (query: string) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      return searchGitHubRepositories(query, controller.signal);
    },
    onError: (error: Error) => {
      // Silently ignore abort errors
      if (error.name === 'AbortError') {
        return;
      }
    },
  });

  const search = useCallback((query: string) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Clear results if query is empty or too short
    if (!query || query.trim().length < 2) {
      mutation.reset();
      return;
    }

    // Debounce the search
    debounceTimerRef.current = setTimeout(() => {
      mutation.mutate(query);
    }, 300); // Debounce delay
  }, [mutation]);

  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    mutation.reset();
  }, [mutation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    repos: mutation.data ?? [],
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
    search,
    clear,
  };
}
