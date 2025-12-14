import { Session, RepoInfo } from '../types/session';

/**
 * Gets the primary repository URL from a session, handling both old and new formats.
 * Prefers the new `repos` array format, falls back to deprecated `repo` field.
 */
export function getSessionRepo(session: Session): string {
  if (session.repos && session.repos.length > 0) {
    return session.repos[0].url;
  }
  return session.repo || '';
}

/**
 * Gets all repository configurations from a session.
 * Returns an array even for sessions using the old format.
 */
export function getSessionRepos(session: Session): RepoInfo[] {
  if (session.repos && session.repos.length > 0) {
    return session.repos;
  }

  // Fall back to old format: convert single repo to array
  if (session.repo) {
    return [
      {
        url: session.repo,
        branch: session.branch,
      },
    ];
  }

  return [];
}

/**
 * Migrates a session from old format (repo) to new format (repos).
 * This is useful for normalizing data received from the backend.
 */
export function migrateSessionToNewFormat(session: Session): Session {
  // If already using new format, return as-is
  if (session.repos && session.repos.length > 0) {
    return session;
  }

  // If using old format, convert to new format
  if (session.repo) {
    return {
      ...session,
      repos: [
        {
          url: session.repo,
          branch: session.branch,
        },
      ],
      // Keep the old fields for backwards compatibility
      repo: session.repo,
    };
  }

  return session;
}

/**
 * Checks if a session is using the new repos format.
 */
export function isUsingNewFormat(session: Session): boolean {
  return !!(session.repos && session.repos.length > 0);
}
