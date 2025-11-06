import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import debounce from "lodash.debounce";
import { z } from "zod";
import { GitHubRepo, GitHubSearchResponseSchema } from "../schemas/github";

const GITHUB_API_BASE = "https://api.github.com";

// Schema for validating search query
const SearchQuerySchema = z
  .string()
  .min(2, "Search query must be at least 2 characters")
  .trim();

async function searchGitHubRepositories(query: string): Promise<GitHubRepo[]> {
  // Parse and validate search query
  const validatedQuery = SearchQuerySchema.parse(query);
  const searchQuery = encodeURIComponent(validatedQuery);
  const url = `${GITHUB_API_BASE}/search/repositories?q=${searchQuery}&sort=stars&order=desc&per_page=20`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "GitHub API rate limit exceeded. Please try again later."
      );
    }
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const rawData = await response.json();
  // Parse and validate the response data (parse don't validate)
  const data = GitHubSearchResponseSchema.parse(rawData);
  return data.items;
}

export function useGitHubRepoSearch() {
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["githubRepos", debouncedQuery],
    queryFn: () => searchGitHubRepositories(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const debouncedSetQuery = useMemo(
    () =>
      debounce((query: string) => {
        if (query && query.trim().length >= 2) {
          setDebouncedQuery(query);
        } else {
          setDebouncedQuery("");
        }
      }, 300),
    []
  );

  const search = (query: string) => {
    debouncedSetQuery(query);
  };

  const clear = () => {
    debouncedSetQuery.cancel();
    setDebouncedQuery("");
  };

  return {
    repos: data ?? [],
    isLoading,
    error: error?.message ?? null,
    search,
    clear,
  };
}
