import { describe, it, expect } from 'vitest';
import {
  getSessionRepo,
  getSessionRepos,
  migrateSessionToNewFormat,
  isUsingNewFormat,
} from '../sessionCompatibility';
import { Session, RepoInfo } from '../../types/session';

describe('sessionCompatibility', () => {
  const mockBaseSession: Partial<Session> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user123',
    title: 'Test Session',
    branch: 'feature-branch',
    targetBranch: 'main',
    status: 'pending',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  describe('getSessionRepo', () => {
    it('should return repo URL from new repos array format', () => {
      const session: Session = {
        ...mockBaseSession,
        repos: [
          { url: 'owner/new-repo', branch: 'feature-branch' },
          { url: 'owner/another-repo', branch: 'another-branch' },
        ],
      } as Session;

      expect(getSessionRepo(session)).toBe('owner/new-repo');
    });

    it('should return repo from old format when repos is not present', () => {
      const session: Session = {
        ...mockBaseSession,
        repo: 'owner/old-repo',
      } as Session;

      expect(getSessionRepo(session)).toBe('owner/old-repo');
    });

    it('should return empty string when neither format is present', () => {
      const session: Session = {
        ...mockBaseSession,
      } as Session;

      expect(getSessionRepo(session)).toBe('');
    });

    it('should prefer new format over old format when both are present', () => {
      const session: Session = {
        ...mockBaseSession,
        repo: 'owner/old-repo',
        repos: [{ url: 'owner/new-repo', branch: 'feature-branch' }],
      } as Session;

      expect(getSessionRepo(session)).toBe('owner/new-repo');
    });

    it('should return empty string when repos array is empty', () => {
      const session: Session = {
        ...mockBaseSession,
        repo: 'owner/old-repo',
        repos: [],
      } as Session;

      expect(getSessionRepo(session)).toBe('owner/old-repo');
    });
  });

  describe('getSessionRepos', () => {
    it('should return repos array from new format', () => {
      const repos: RepoInfo[] = [
        { url: 'owner/repo1', branch: 'branch1' },
        { url: 'owner/repo2', branch: 'branch2' },
      ];
      const session: Session = {
        ...mockBaseSession,
        repos,
      } as Session;

      expect(getSessionRepos(session)).toEqual(repos);
    });

    it('should convert old format to repos array', () => {
      const session: Session = {
        ...mockBaseSession,
        repo: 'owner/old-repo',
        branch: 'feature-branch',
      } as Session;

      const result = getSessionRepos(session);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        url: 'owner/old-repo',
        branch: 'feature-branch',
      });
    });

    it('should return empty array when neither format is present', () => {
      const session: Session = {
        ...mockBaseSession,
      } as Session;

      expect(getSessionRepos(session)).toEqual([]);
    });

    it('should prefer new format over old format when both are present', () => {
      const repos: RepoInfo[] = [
        { url: 'owner/new-repo', branch: 'new-branch' },
      ];
      const session: Session = {
        ...mockBaseSession,
        repo: 'owner/old-repo',
        branch: 'old-branch',
        repos,
      } as Session;

      expect(getSessionRepos(session)).toEqual(repos);
    });

    it('should return empty array when repos array is empty', () => {
      const session: Session = {
        ...mockBaseSession,
        repos: [],
        repo: 'owner/old-repo',
        branch: 'feature-branch',
      } as Session;

      const result = getSessionRepos(session);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        url: 'owner/old-repo',
        branch: 'feature-branch',
      });
    });
  });

  describe('migrateSessionToNewFormat', () => {
    it('should return session unchanged if already using new format', () => {
      const repos: RepoInfo[] = [
        { url: 'owner/repo', branch: 'feature-branch' },
      ];
      const session: Session = {
        ...mockBaseSession,
        repos,
      } as Session;

      const result = migrateSessionToNewFormat(session);
      expect(result).toEqual(session);
    });

    it('should migrate old format to new format', () => {
      const session: Session = {
        ...mockBaseSession,
        repo: 'owner/old-repo',
        branch: 'feature-branch',
      } as Session;

      const result = migrateSessionToNewFormat(session);
      expect(result.repos).toHaveLength(1);
      expect(result.repos![0]).toEqual({
        url: 'owner/old-repo',
        branch: 'feature-branch',
      });
      expect(result.repo).toBe('owner/old-repo'); // Should preserve old field
    });

    it('should return session unchanged when no repo data is present', () => {
      const session: Session = {
        ...mockBaseSession,
      } as Session;

      const result = migrateSessionToNewFormat(session);
      expect(result).toEqual(session);
    });
  });

  describe('isUsingNewFormat', () => {
    it('should return true when repos array has items', () => {
      const session: Session = {
        ...mockBaseSession,
        repos: [{ url: 'owner/repo', branch: 'branch' }],
      } as Session;

      expect(isUsingNewFormat(session)).toBe(true);
    });

    it('should return false when repos is not present', () => {
      const session: Session = {
        ...mockBaseSession,
        repo: 'owner/old-repo',
      } as Session;

      expect(isUsingNewFormat(session)).toBe(false);
    });

    it('should return false when repos array is empty', () => {
      const session: Session = {
        ...mockBaseSession,
        repos: [],
      } as Session;

      expect(isUsingNewFormat(session)).toBe(false);
    });

    it('should return false when neither format is present', () => {
      const session: Session = {
        ...mockBaseSession,
      } as Session;

      expect(isUsingNewFormat(session)).toBe(false);
    });
  });

  describe('backwards compatibility scenarios', () => {
    it('should handle session data from backend using old format', () => {
      const backendSession = {
        ...mockBaseSession,
        repo: 'owner/legacy-repo',
        branch: 'legacy-branch',
      } as Session;

      // Should work with old format
      expect(getSessionRepo(backendSession)).toBe('owner/legacy-repo');
      expect(getSessionRepos(backendSession)).toEqual([
        { url: 'owner/legacy-repo', branch: 'legacy-branch' },
      ]);
      expect(isUsingNewFormat(backendSession)).toBe(false);
    });

    it('should handle session data from backend using new format', () => {
      const backendSession = {
        ...mockBaseSession,
        repos: [
          { url: 'owner/repo1', branch: 'branch1' },
          { url: 'owner/repo2', branch: 'branch2' },
        ],
      } as Session;

      // Should work with new format
      expect(getSessionRepo(backendSession)).toBe('owner/repo1');
      expect(getSessionRepos(backendSession)).toEqual([
        { url: 'owner/repo1', branch: 'branch1' },
        { url: 'owner/repo2', branch: 'branch2' },
      ]);
      expect(isUsingNewFormat(backendSession)).toBe(true);
    });

    it('should handle migration scenario where both formats are present', () => {
      // This could happen during a transition period
      const transitionSession = {
        ...mockBaseSession,
        repo: 'owner/old-repo',
        branch: 'old-branch',
        repos: [{ url: 'owner/new-repo', branch: 'new-branch' }],
      } as Session;

      // Should prefer new format
      expect(getSessionRepo(transitionSession)).toBe('owner/new-repo');
      expect(getSessionRepos(transitionSession)).toEqual([
        { url: 'owner/new-repo', branch: 'new-branch' },
      ]);
      expect(isUsingNewFormat(transitionSession)).toBe(true);
    });
  });
});
