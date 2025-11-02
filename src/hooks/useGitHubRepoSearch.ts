import { useState, useCallback, useEffect, useRef } from 'react';

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

export function useGitHubRepoSearch(): UseGitHubRepoSearchResult {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      setRepos([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Debounce the search
    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const searchQuery = encodeURIComponent(query.trim());
        const url = `${GITHUB_API_BASE}/search/repositories?q=${searchQuery}&sort=stars&order=desc&per_page=20`;

        const response = await fetch(url, {
          signal: controller.signal,
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
        setRepos(data.items);
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            // Request was cancelled, do nothing
            return;
          }
          setError(err.message);
        } else {
          setError('Failed to search repositories');
        }
        setRepos([]);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }, 300); // Debounce delay
  }, []);

  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setRepos([]);
    setError(null);
    setIsLoading(false);
  }, []);

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
    repos,
    isLoading,
    error,
    search,
    clear,
  };
}
