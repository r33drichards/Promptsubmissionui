import { z } from 'zod';

// GitHub Branch schema
export const GitHubBranchSchema = z.object({
  name: z.string(),
  commit: z.object({
    sha: z.string(),
    url: z.string(),
  }),
  protected: z.boolean(),
});

// GitHub Repository Info schema
export const GitHubRepoInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  default_branch: z.string(),
  private: z.boolean().optional(),
  description: z.string().nullable().optional(),
  html_url: z.string().optional(),
});

// GitHub Repo schema (for search results)
export const GitHubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  owner: z.object({
    login: z.string(),
  }),
  description: z.string().nullable().optional(),
  private: z.boolean().optional(),
  html_url: z.string(),
  stargazers_count: z.number(),
  language: z.string().nullable().optional(),
});

// GitHub Search Response schema
export const GitHubSearchResponseSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean().optional(),
  items: z.array(GitHubRepoSchema),
});

// Array schemas
export const GitHubBranchesArraySchema = z.array(GitHubBranchSchema);

// Infer TypeScript types from schemas
export type GitHubBranch = z.infer<typeof GitHubBranchSchema>;
export type GitHubRepoInfo = z.infer<typeof GitHubRepoInfoSchema>;
export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;
export type GitHubSearchResponse = z.infer<typeof GitHubSearchResponseSchema>;
