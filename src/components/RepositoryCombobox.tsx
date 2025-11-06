"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useGitHubRepoSearch } from "../hooks/useGitHubRepoSearch";

interface RepositoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  repositories: string[];
  id?: string;
}

export function RepositoryCombobox({
  value,
  onChange,
  repositories,
  id,
}: RepositoryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const {
    repos: githubRepos,
    isLoading,
    error,
    search,
    clear,
  } = useGitHubRepoSearch();

  const handleSearchChange = (newQuery: string) => {
    setSearchQuery(newQuery);
    search(newQuery);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery("");
      clear();
    }
  };

  const handleSelect = (selectedRepo: string) => {
    // Always set the selected repo, don't toggle to empty
    // (repo is a required field)
    onChange(selectedRepo);
    setOpen(false);
  };

  // Filter recent repositories based on search query
  const filteredRecentRepos = repositories.filter((repo) =>
    repo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Display logic
  const hasRecentRepos = filteredRecentRepos.length > 0;
  const hasGitHubRepos = githubRepos.length > 0;
  const hasAnyRepos = hasRecentRepos || hasGitHubRepos;
  const showEmptyState =
    !hasAnyRepos && !isLoading && searchQuery.trim().length >= 2;
  const showInitialState =
    !hasAnyRepos &&
    !isLoading &&
    repositories.length === 0 &&
    searchQuery.trim().length < 2;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || "Select repository..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search GitHub repositories..."
            value={searchQuery}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  Searching GitHub...
                </span>
              </div>
            )}

            {error && (
              <div className="px-2 py-3 text-sm text-red-500">{error}</div>
            )}

            {showInitialState && (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                <p className="mb-1">No recent repositories</p>
                <p className="text-xs">Type to search GitHub repositories...</p>
              </div>
            )}

            {showEmptyState && (
              <CommandEmpty>No repository found.</CommandEmpty>
            )}

            {hasRecentRepos && (
              <CommandGroup heading="Recent Repositories">
                {filteredRecentRepos.map((repo) => (
                  <CommandItem
                    key={`recent-${repo}`}
                    value={repo}
                    onSelect={() => handleSelect(repo)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === repo ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {repo}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {hasGitHubRepos && (
              <CommandGroup heading="GitHub Repositories">
                {githubRepos.map((repo) => (
                  <CommandItem
                    key={`github-${repo.id}`}
                    value={repo.full_name}
                    onSelect={() => handleSelect(repo.full_name)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === repo.full_name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{repo.full_name}</span>
                      {repo.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {repo.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
