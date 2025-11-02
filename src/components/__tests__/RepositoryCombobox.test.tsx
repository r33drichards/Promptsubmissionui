import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepositoryCombobox } from '../RepositoryCombobox';
import { TestProviders } from '../../test/utils';

// Mock GitHub API response
const mockGitHubResponse = {
  items: [
    {
      id: 1,
      full_name: 'facebook/react',
      name: 'react',
      owner: { login: 'facebook' },
      description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
      html_url: 'https://github.com/facebook/react',
      stargazers_count: 200000,
    },
    {
      id: 2,
      full_name: 'vercel/next.js',
      name: 'next.js',
      owner: { login: 'vercel' },
      description: 'The React Framework',
      html_url: 'https://github.com/vercel/next.js',
      stargazers_count: 100000,
    },
  ],
  total_count: 2,
};

describe('RepositoryCombobox', () => {
  const mockOnChange = vi.fn();
  const recentRepositories = ['test/repo-1', 'test/repo-2', 'user/another-repo'];

  beforeEach(() => {
    mockOnChange.mockClear();
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the combobox button', () => {
      render(
        <TestProviders>
          <RepositoryCombobox
            value=""
            onChange={mockOnChange}
            repositories={recentRepositories}
          />
        </TestProviders>
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Select repository...')).toBeInTheDocument();
    });

    it('should display the selected value', () => {
      render(
        <TestProviders>
          <RepositoryCombobox
            value="test/repo-1"
            onChange={mockOnChange}
            repositories={recentRepositories}
          />
        </TestProviders>
      );

      expect(screen.getByText('test/repo-1')).toBeInTheDocument();
    });
  });

  describe('Recent Repositories', () => {
    it('should display recent repositories when opened', async () => {
      const user = userEvent.setup();
      render(
        <TestProviders>
          <RepositoryCombobox
            value=""
            onChange={mockOnChange}
            repositories={recentRepositories}
          />
        </TestProviders>
      );

      // Click to open the combobox
      await user.click(screen.getByRole('combobox'));

      // Wait for popover to open and check for recent repos
      await waitFor(() => {
        expect(screen.getByText('Recent Repositories')).toBeInTheDocument();
      });

      expect(screen.getByText('test/repo-1')).toBeInTheDocument();
      expect(screen.getByText('test/repo-2')).toBeInTheDocument();
      expect(screen.getByText('user/another-repo')).toBeInTheDocument();
    });

    it('should filter recent repositories based on search', async () => {
      const user = userEvent.setup();
      render(
        <TestProviders>
          <RepositoryCombobox
            value=""
            onChange={mockOnChange}
            repositories={recentRepositories}
          />
        </TestProviders>
      );

      await user.click(screen.getByRole('combobox'));

      // Wait for popover and type in search
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search GitHub repositories...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search GitHub repositories...');
      await user.type(searchInput, 'test');

      // Should only show repos matching "test"
      await waitFor(() => {
        expect(screen.getByText('test/repo-1')).toBeInTheDocument();
        expect(screen.getByText('test/repo-2')).toBeInTheDocument();
      });

      // Should not show the one that doesn't match
      expect(screen.queryByText('user/another-repo')).not.toBeInTheDocument();
    });

    it('should call onChange when a recent repository is selected', async () => {
      const user = userEvent.setup();
      render(
        <TestProviders>
          <RepositoryCombobox
            value=""
            onChange={mockOnChange}
            repositories={recentRepositories}
          />
        </TestProviders>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('test/repo-1')).toBeInTheDocument();
      });

      // Click on a repository
      await user.click(screen.getByText('test/repo-1'));

      expect(mockOnChange).toHaveBeenCalledWith('test/repo-1');
    });
  });

  describe('GitHub API Search', () => {
    it('should search GitHub when typing 2+ characters', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGitHubResponse,
      });

      render(
        <TestProviders>
          <RepositoryCombobox
            value=""
            onChange={mockOnChange}
            repositories={recentRepositories}
          />
        </TestProviders>
      );

      await user.click(screen.getByRole('combobox'));

      const searchInput = await screen.findByPlaceholderText('Search GitHub repositories...');

      // Type search query
      await user.type(searchInput, 'react');

      // Wait for loading state
      await waitFor(() => {
        expect(screen.getByText('Searching GitHub...')).toBeInTheDocument();
      }, { timeout: 500 });

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('GitHub Repositories')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText('facebook/react')).toBeInTheDocument();
      expect(screen.getByText('vercel/next.js')).toBeInTheDocument();

      // Check for descriptions
      expect(screen.getByText(/declarative, efficient/i)).toBeInTheDocument();
      expect(screen.getByText(/The React Framework/i)).toBeInTheDocument();

      // Verify API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com/search/repositories?q=react'),
        expect.objectContaining({
          headers: {
            'Accept': 'application/vnd.github.v3+json',
          },
        })
      );
    });

    it('should not search GitHub with less than 2 characters', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders>
          <RepositoryCombobox
            value=""
            onChange={mockOnChange}
            repositories={recentRepositories}
          />
        </TestProviders>
      );

      await user.click(screen.getByRole('combobox'));

      const searchInput = await screen.findByPlaceholderText('Search GitHub repositories...');

      // Type only 1 character
      await user.type(searchInput, 'r');

      // Wait a bit to ensure no API call is made
      await new Promise(resolve => setTimeout(resolve, 400));

      // API should not have been called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle GitHub API errors', async () => {
      const user = userEvent.setup();

      // Mock API error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      render(
        <TestProviders>
          <RepositoryCombobox
            value=""
            onChange={mockOnChange}
            repositories={recentRepositories}
          />
        </TestProviders>
      );

      await user.click(screen.getByRole('combobox'));

      const searchInput = await screen.findByPlaceholderText('Search GitHub repositories...');
      await user.type(searchInput, 'react');

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/GitHub API rate limit exceeded/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should call onChange when a GitHub repository is selected', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGitHubResponse,
      });

      render(
        <TestProviders>
          <RepositoryCombobox
            value=""
            onChange={mockOnChange}
            repositories={recentRepositories}
          />
        </TestProviders>
      );

      await user.click(screen.getByRole('combobox'));

      const searchInput = await screen.findByPlaceholderText('Search GitHub repositories...');
      await user.type(searchInput, 'react');

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('facebook/react')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click on a GitHub repository
      await user.click(screen.getByText('facebook/react'));

      expect(mockOnChange).toHaveBeenCalledWith('facebook/react');
    });

    it('should debounce API calls', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockGitHubResponse,
      });

      render(
        <TestProviders>
          <RepositoryCombobox
            value=""
            onChange={mockOnChange}
            repositories={recentRepositories}
          />
        </TestProviders>
      );

      await user.click(screen.getByRole('combobox'));

      const searchInput = await screen.findByPlaceholderText('Search GitHub repositories...');

      // Type multiple characters quickly
      await user.type(searchInput, 'react');

      // Wait for debounce + API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });

  describe('Popover Behavior', () => {
    it('should close popover after selection', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders>
          <RepositoryCombobox
            value=""
            onChange={mockOnChange}
            repositories={recentRepositories}
          />
        </TestProviders>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('test/repo-1')).toBeInTheDocument();
      });

      await user.click(screen.getByText('test/repo-1'));

      // Popover should close - search input should not be visible
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search GitHub repositories...')).not.toBeInTheDocument();
      });
    });

    it('should clear search when popover closes', async () => {
      const user = userEvent.setup();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGitHubResponse,
      });

      render(
        <TestProviders>
          <RepositoryCombobox
            value=""
            onChange={mockOnChange}
            repositories={recentRepositories}
          />
        </TestProviders>
      );

      // Open and search
      await user.click(screen.getByRole('combobox'));

      const searchInput = await screen.findByPlaceholderText('Search GitHub repositories...');
      await user.type(searchInput, 'react');

      // Close by clicking outside (click the button again)
      await user.click(screen.getByRole('combobox'));

      // Re-open
      await user.click(screen.getByRole('combobox'));

      // Search input should be empty
      const newSearchInput = await screen.findByPlaceholderText('Search GitHub repositories...');
      expect(newSearchInput).toHaveValue('');
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no results found', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders>
          <RepositoryCombobox
            value=""
            onChange={mockOnChange}
            repositories={[]}
          />
        </TestProviders>
      );

      await user.click(screen.getByRole('combobox'));

      const searchInput = await screen.findByPlaceholderText('Search GitHub repositories...');
      await user.type(searchInput, 'xyz');

      // Mock empty response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total_count: 0 }),
      });

      await waitFor(() => {
        expect(screen.getByText('No repository found.')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
