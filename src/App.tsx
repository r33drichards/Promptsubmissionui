import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Routes,
  Route,
  useParams,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { OidcSecure } from '@axa-fr/react-oidc';
import { useAuth } from './hooks/useAuth';
import { UiStatus } from '@wholelottahoopla/prompt-backend-client';
import { Session } from './types/session';
import { CreateSessionData } from './services/api/types';
import { SessionListItem } from './components/SessionListItem';
import { SessionDetail } from './components/SessionDetail';
import { CreateTaskForm } from './components/CreateTaskForm';
import { ArchiveSessionDialog } from './components/ArchiveSessionDialog';
import { Button } from './components/ui/button';
import { MultiSelect } from './components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import {
  Plus,
  Loader2,
  CircleUser,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSessions,
  useCreateSession,
  useArchiveSession,
  useUnarchiveSession,
} from './hooks';

type FilterType = 'pending' | 'in-progress' | 'needs-review' | 'archived';
type SortType = 'date' | 'topological' | 'reverse-topological';

const filterMap: Record<FilterType, UiStatus[]> = {
  pending: ['Pending' as UiStatus],
  'in-progress': ['InProgress' as UiStatus],
  'needs-review': [
    'NeedsReviewIpReturned' as UiStatus,
    'NeedsReview' as UiStatus,
  ],
  archived: ['Archived' as UiStatus],
};

const filterOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Needs Review', value: 'needs-review' },
  { label: 'Archived', value: 'archived' },
];

const sortOptions = [
  { label: 'Tree View', value: 'date' },
  { label: 'Topological (Parents First)', value: 'topological' },
  {
    label: 'Reverse Topological (Children First)',
    value: 'reverse-topological',
  },
];

function AppLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout, isAuthenticated } = useAuth();

  // Initialize filters from URL, then localStorage, then default
  const [filters, setFilters] = useState<FilterType[]>(() => {
    // First, try to get filters from URL
    const urlFilters = searchParams.get('filters');
    if (urlFilters) {
      try {
        const parsed = urlFilters.split(',') as FilterType[];
        // Validate that all filters are valid
        const validFilters = parsed.filter((f) =>
          ['pending', 'in-progress', 'needs-review', 'archived'].includes(f)
        );
        if (validFilters.length > 0) {
          return validFilters;
        }
      } catch {
        // Continue to localStorage fallback
      }
    }

    // Fall back to localStorage
    const saved = window.localStorage.getItem('sessionFilters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return ['needs-review'];
      }
    }
    return ['needs-review'];
  });

  // Initialize session tree filter from URL, then localStorage, then default (null = show all)
  const [sessionTreeFilter, setSessionTreeFilter] = useState<string | null>(
    () => {
      // First, try to get from URL
      const urlSessionTree = searchParams.get('sessionTree');
      if (urlSessionTree) {
        return urlSessionTree;
      }

      // Fall back to localStorage
      const saved = window.localStorage.getItem('sessionTreeFilter');
      if (saved && saved !== 'null') {
        return saved;
      }
      return null;
    }
  );

  // Initialize sort order from URL, then localStorage, then default
  const [sortOrder, setSortOrder] = useState<SortType>(() => {
    // First, try to get from URL
    const urlSort = searchParams.get('sort');
    if (
      urlSort &&
      ['date', 'topological', 'reverse-topological'].includes(urlSort)
    ) {
      return urlSort as SortType;
    }

    // Fall back to localStorage
    const saved = window.localStorage.getItem('sessionSortOrder');
    if (
      saved &&
      ['date', 'topological', 'reverse-topological'].includes(saved)
    ) {
      return saved as SortType;
    }
    return 'date';
  });

  // Track the user's preferred sort order for when viewing a single session tree
  // This allows us to restore topo sort when going from all trees -> single tree
  const [preferredSortOrder, setPreferredSortOrder] = useState<SortType>(() => {
    const saved = window.localStorage.getItem('preferredSortOrder');
    if (
      saved &&
      ['date', 'topological', 'reverse-topological'].includes(saved)
    ) {
      return saved as SortType;
    }
    return 'date';
  });

  // Track the previous sessionTreeFilter value to detect transitions
  const _prevSessionTreeFilterRef = useRef<string | null>(sessionTreeFilter);

  // Fetch sessions using TanStack Query
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    refetch: refetchSessions,
    isFetching: isFetchingSessions,
  } = useSessions();

  // Mutations
  const createSessionMutation = useCreateSession();
  const archiveSessionMutation = useArchiveSession();
  const unarchiveSessionMutation = useUnarchiveSession();

  // Derive selectedSession from URL parameter
  const selectedSession = useMemo(() => {
    if (!id) return null;
    return sessions.find((s) => s.id === id) || null;
  }, [id, sessions]);

  // Handle invalid session IDs
  useEffect(() => {
    // Only check after sessions have loaded
    if (!isLoadingSessions && id && !selectedSession) {
      toast.error('Session not found');
      navigate('/');
    }
  }, [id, sessions, selectedSession, navigate, isLoadingSessions]);

  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [parentForNewTask, setParentForNewTask] = useState<Session | null>(
    null
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = window.localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [sessionToArchive, setSessionToArchive] = useState<Session | null>(
    null
  );

  // Persist sidebar collapsed state
  useEffect(() => {
    window.localStorage.setItem(
      'sidebarCollapsed',
      JSON.stringify(sidebarCollapsed)
    );
  }, [sidebarCollapsed]);

  // Sync filters with URL and localStorage
  useEffect(() => {
    // Update localStorage
    window.localStorage.setItem('sessionFilters', JSON.stringify(filters));

    // Update URL search params
    const currentFiltersParam = searchParams.get('filters');
    const newFiltersParam = filters.length > 0 ? filters.join(',') : null;

    // Only update if the URL needs to change
    if (currentFiltersParam !== newFiltersParam) {
      const newSearchParams = new URLSearchParams(searchParams);
      if (filters.length > 0) {
        newSearchParams.set('filters', filters.join(','));
      } else {
        newSearchParams.delete('filters');
      }
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  // Sync session tree filter with URL and localStorage
  useEffect(() => {
    // Update localStorage
    window.localStorage.setItem(
      'sessionTreeFilter',
      sessionTreeFilter || 'null'
    );

    // Update URL search params
    const currentTreeParam = searchParams.get('sessionTree');
    const newTreeParam = sessionTreeFilter;

    // Only update if the URL needs to change
    if (currentTreeParam !== newTreeParam) {
      const newSearchParams = new URLSearchParams(searchParams);
      if (sessionTreeFilter) {
        newSearchParams.set('sessionTree', sessionTreeFilter);
      } else {
        newSearchParams.delete('sessionTree');
      }
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [sessionTreeFilter, searchParams, setSearchParams]);

  // Sync sort order with URL and localStorage
  useEffect(() => {
    // Update localStorage
    window.localStorage.setItem('sessionSortOrder', sortOrder);

    // Update URL search params
    const currentSortParam = searchParams.get('sort');

    // Only update if the URL needs to change
    if (currentSortParam !== sortOrder) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('sort', sortOrder);
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [sortOrder, searchParams, setSearchParams]);

  // Persist preferred sort order separately
  useEffect(() => {
    window.localStorage.setItem('preferredSortOrder', preferredSortOrder);
  }, [preferredSortOrder]);

  // Handle state transitions when switching between all trees and single tree views
  useEffect(() => {
    // When switching to all session trees (sessionTreeFilter becomes null)
    if (!sessionTreeFilter) {
      // If we're in topo sort, save it as the preferred sort order
      if (sortOrder === 'topological' || sortOrder === 'reverse-topological') {
        setPreferredSortOrder(sortOrder);
        // Force convert to tree view (date sort)
        setSortOrder('date');
      }
    } else {
      // When switching to a specific session tree (sessionTreeFilter is set)
      // Restore the preferred sort order if it was a topo sort
      if (
        sortOrder === 'date' &&
        (preferredSortOrder === 'topological' ||
          preferredSortOrder === 'reverse-topological')
      ) {
        setSortOrder(preferredSortOrder);
      }
    }
  }, [sessionTreeFilter]); // Only run when sessionTreeFilter changes

  // Get sorted repositories by most recently used
  const sortedRepositories = useMemo(() => {
    const repoMap = new Map<string, Date>();

    // Track the most recent usage of each repository
    sessions.forEach((session) => {
      const existing = repoMap.get(session.repo);
      if (!existing || session.createdAt > existing) {
        repoMap.set(session.repo, session.createdAt);
      }
    });

    // Sort by most recent usage
    return Array.from(repoMap.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .map(([repo]) => repo);
  }, [sessions]);

  // Note: Branches are now fetched from GitHub API in CreateTaskForm
  // based on the selected repository

  // Build hierarchical structure with filtering
  const hierarchicalSessions = useMemo(() => {
    const sessionMap = new Map<string, Session>();
    const rootSessions: Session[] = [];

    // If no filters selected, return empty array (user must select filters)
    if (filters.length === 0) {
      return rootSessions;
    }

    // Filter sessions based on selected filters using filterMap
    const allowedStatuses = filters.flatMap((filter) => filterMap[filter]);
    const filteredSessions = sessions.filter((s) =>
      allowedStatuses.includes(s.uiStatus)
    );

    // First pass: create a map of all sessions
    filteredSessions.forEach((session) => {
      sessionMap.set(session.id, { ...session, children: [] });
    });

    // Second pass: build hierarchy
    filteredSessions.forEach((session) => {
      const sessionWithChildren = sessionMap.get(session.id)!;
      if (session.parentId) {
        const parent = sessionMap.get(session.parentId);
        if (parent) {
          parent.children!.push(sessionWithChildren);
        } else {
          rootSessions.push(sessionWithChildren);
        }
      } else {
        rootSessions.push(sessionWithChildren);
      }
    });

    return rootSessions;
  }, [sessions, filters]);

  // Get list of root sessions for the session tree filter dropdown
  // Only include sessions that have no parent (parentId === null)
  const rootSessionOptions = useMemo(() => {
    return sessions
      .filter((session) => session.parentId === null)
      .filter((session) => {
        // Apply status filters
        if (filters.length === 0) return false;
        const allowedStatuses = filters.flatMap((filter) => filterMap[filter]);
        return allowedStatuses.includes(session.uiStatus);
      })
      .map((session) => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [sessions, filters]);

  // Sort sessions and apply session tree filter
  const filteredSessions = useMemo(() => {
    // Sort by date (newest first)
    const sortByDate = (sessions: Session[]): Session[] => {
      return sessions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((session) => ({
          ...session,
          children: session.children ? sortByDate(session.children) : [],
        }));
    };

    // Topological sort (parents before children) - flattens the hierarchy
    const sortTopological = (sessions: Session[]): Session[] => {
      const result: Session[] = [];
      const visited = new Set<string>();

      const visit = (session: Session) => {
        if (visited.has(session.id)) return;
        visited.add(session.id);

        // Add parent first
        result.push({ ...session, children: [] });

        // Then visit children (sorted by date)
        if (session.children && session.children.length > 0) {
          const sortedChildren = [...session.children].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );
          sortedChildren.forEach(visit);
        }
      };

      // Sort root sessions by date first
      const sortedRoots = [...sessions].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      sortedRoots.forEach(visit);

      return result;
    };

    // Reverse topological sort (children before parents) - flattens the hierarchy
    const sortReverseTopological = (sessions: Session[]): Session[] => {
      const result: Session[] = [];
      const visited = new Set<string>();

      const visit = (session: Session) => {
        if (visited.has(session.id)) return;
        visited.add(session.id);

        // Visit children first (sorted by date, deepest first)
        if (session.children && session.children.length > 0) {
          const sortedChildren = [...session.children].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );
          sortedChildren.forEach(visit);
        }

        // Then add parent
        result.push({ ...session, children: [] });
      };

      // Sort root sessions by date first
      const sortedRoots = [...sessions].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      sortedRoots.forEach(visit);

      return result;
    };

    let sessionsToDisplay = [...hierarchicalSessions];

    // Apply session tree filter if one is selected
    if (sessionTreeFilter) {
      sessionsToDisplay = sessionsToDisplay.filter(
        (session) => session.id === sessionTreeFilter
      );
    }

    // Don't allow topological sort when all session trees are selected
    // (i.e., when sessionTreeFilter is null)
    if (
      !sessionTreeFilter &&
      (sortOrder === 'topological' || sortOrder === 'reverse-topological')
    ) {
      return sortByDate(sessionsToDisplay);
    }

    // Apply sorting based on sortOrder
    switch (sortOrder) {
      case 'topological':
        return sortTopological(sessionsToDisplay);
      case 'reverse-topological':
        return sortReverseTopological(sessionsToDisplay);
      case 'date':
      default:
        return sortByDate(sessionsToDisplay);
    }
  }, [hierarchicalSessions, sessionTreeFilter, sortOrder]);

  const handleCreateTask = (task: CreateSessionData) => {
    createSessionMutation.mutate(task, {
      onSuccess: (newSession) => {
        navigate(`/session/${newSession.id}`);
        setIsCreatingTask(false);
        setParentForNewTask(null);
      },
    });
  };

  const handleCreateSubtask = (parentId: string) => {
    const parent = sessions.find((s) => s.id === parentId);
    setParentForNewTask(parent || null);
    navigate('/');
    setIsCreatingTask(true);
  };

  const handleCancelCreate = () => {
    setIsCreatingTask(false);
    setParentForNewTask(null);
    setResubmitSession(null);
    // Don't navigate - stay on current URL
  };

  const [resubmitSession, setResubmitSession] = useState<Session | null>(null);

  const handleResubmit = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      // Pass the session to CreateTaskForm which will fetch and display the original prompt
      setResubmitSession(session);
      setParentForNewTask(null);
      navigate('/');
      setIsCreatingTask(true);
    }
  };

  // Disabled for now - will be re-enabled when CLI integration is ready
  // const handleOpenInCLI = (sessionId: string) => {
  //   const session = sessions.find((s) => s.id === sessionId);
  //   if (session) {
  //     toast.info(`Opening ${session.repo} in CLI...`);
  //   }
  // };

  const handleArchive = (sessionId: string) => {
    console.log('[App] handleArchive called for session:', sessionId);

    // Find the session to check if it has children
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      console.error('[App] Session not found:', sessionId);
      return;
    }

    // Check if session has children
    const hasChildren = session.children && session.children.length > 0;

    if (hasChildren) {
      // Show modal to ask about archiving children
      setSessionToArchive(session);
      setArchiveDialogOpen(true);
    } else {
      // No children, archive directly
      performArchive(sessionId, false);
    }
  };

  const performArchive = (sessionId: string, archiveChildren: boolean) => {
    if (archiveChildren) {
      // Archive parent and all children
      const session = sessions.find((s) => s.id === sessionId);
      const childIds = session?.children?.map((c) => c.id) || [];
      const allIds = [sessionId, ...childIds];

      // Archive all children first
      const archivePromises = childIds.map((childId) =>
        archiveSessionMutation.mutateAsync(childId)
      );

      Promise.all(archivePromises)
        .then(() => {
          // Then archive the parent
          archiveSessionMutation.mutate(sessionId, {
            onSuccess: () => {
              console.log('[App] Archive mutation succeeded (with children)');
              if (selectedSession?.id === sessionId) {
                navigate('/');
              }
              setArchiveDialogOpen(false);
              setSessionToArchive(null);

              // Show toast with undo action
              toast.success('Task and subtasks archived', {
                action: {
                  label: 'Undo',
                  onClick: () => {
                    // Unarchive all sessions that were archived
                    allIds.forEach((id) => {
                      unarchiveSessionMutation.mutate(id);
                    });
                  },
                },
              });
            },
          });
        })
        .catch((error) => {
          console.error('[App] Failed to archive children:', error);
          toast.error('Failed to archive some subtasks');
        });
    } else {
      // Archive only the parent
      archiveSessionMutation.mutate(sessionId, {
        onSuccess: () => {
          console.log('[App] Archive mutation succeeded (parent only)');
          if (selectedSession?.id === sessionId) {
            navigate('/');
          }
          setArchiveDialogOpen(false);
          setSessionToArchive(null);

          // Show toast with undo action
          toast.success('Task archived', {
            action: {
              label: 'Undo',
              onClick: () => {
                unarchiveSessionMutation.mutate(sessionId);
              },
            },
          });
        },
      });
    }
  };

  const handleArchiveConfirm = (archiveChildren: boolean) => {
    if (sessionToArchive) {
      performArchive(sessionToArchive.id, archiveChildren);
    }
  };

  const handleArchiveCancel = () => {
    setArchiveDialogOpen(false);
    setSessionToArchive(null);
  };

  const handleUnarchive = (sessionId: string) => {
    console.log('[App] handleUnarchive called for session:', sessionId);
    unarchiveSessionMutation.mutate(sessionId, {
      onSuccess: () => {
        console.log('[App] Unarchive mutation succeeded');
        toast.success('Task unarchived', {
          action: {
            label: 'Undo',
            onClick: () => {
              archiveSessionMutation.mutate(sessionId);
            },
          },
        });
      },
    });
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div
        className={`border-r flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-96'
        }`}
      >
        {!sidebarCollapsed ? (
          <>
            {/* Header */}
            <div className="p-4 border-b space-y-3">
              <div className="flex gap-2">
                {isAuthenticated && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        title="Account"
                      >
                        <CircleUser className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      sideOffset={8}
                      className="w-48"
                    >
                      <DropdownMenuLabel>Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => navigate('/')}>
                        Home
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => logout()}
                      >
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => refetchSessions()}
                  disabled={isFetchingSessions}
                  title="Refresh sessions"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isFetchingSessions ? 'animate-spin' : ''}`}
                  />
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setParentForNewTask(null);
                    navigate('/');
                    setIsCreatingTask(true);
                  }}
                  disabled={createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 " />
                  )}
                </Button>
              </div>
              <div className="w-full mt-2 space-y-2">
                <MultiSelect
                  options={filterOptions}
                  selected={filters}
                  onChange={(newFilters) =>
                    setFilters(newFilters as FilterType[])
                  }
                  placeholder="Filter sessions..."
                  className="h-6 text-xs w-full"
                />
                <Select
                  value={sortOrder}
                  onValueChange={(value) => {
                    const newSortOrder = value as SortType;
                    setSortOrder(newSortOrder);
                    // When user manually changes sort, update their preferred sort order
                    if (
                      newSortOrder === 'topological' ||
                      newSortOrder === 'reverse-topological'
                    ) {
                      setPreferredSortOrder(newSortOrder);
                    }
                  }}
                >
                  <SelectTrigger size="sm" className="h-6 text-xs w-full">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={
                          !sessionTreeFilter &&
                          (option.value === 'topological' ||
                            option.value === 'reverse-topological')
                        }
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rootSessionOptions.length > 0 && (
                  <Select
                    value={sessionTreeFilter || 'all'}
                    onValueChange={(value) =>
                      setSessionTreeFilter(value === 'all' ? null : value)
                    }
                  >
                    <SelectTrigger size="sm" className="h-6 text-xs w-full">
                      <SelectValue placeholder="Show all session trees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All session trees</SelectItem>
                      {rootSessionOptions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          <span className="truncate">{session.title}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-auto">
              <div className="p-2">
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredSessions.length > 0 ? (
                  filteredSessions.map((session) => (
                    <SessionListItem
                      key={session.id}
                      session={session}
                      isActive={selectedSession?.id === session.id}
                      onSelect={(session) => navigate(`/session/${session.id}`)}
                      onCreateSubtask={handleCreateSubtask}
                      onArchive={handleArchive}
                      onUnarchive={handleUnarchive}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {filters.length === 0
                      ? 'Please select a filter above to view sessions'
                      : 'No tasks yet'}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center pt-4 gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setParentForNewTask(null);
                navigate('/');
                setIsCreatingTask(true);
              }}
              disabled={createSessionMutation.isPending}
              title="New Task"
            >
              {createSessionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        {/* Collapse Toggle Button */}
        <div className="p-2 border-t">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Collapse
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {isCreatingTask ? (
          <CreateTaskForm
            onSubmit={handleCreateTask}
            onCancel={handleCancelCreate}
            parentSession={parentForNewTask}
            resubmitSession={resubmitSession}
            repositories={sortedRepositories}
            isSubmitting={createSessionMutation.isPending}
          />
        ) : selectedSession ? (
          <SessionDetail
            session={selectedSession}
            onResubmit={handleResubmit}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center space-y-3">
              <p>Select a task to view details</p>
              <Button
                variant="outline"
                onClick={() => {
                  setParentForNewTask(null);
                  navigate('/');
                  setIsCreatingTask(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Task
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Archive Session Dialog */}
      <ArchiveSessionDialog
        open={archiveDialogOpen}
        session={sessionToArchive}
        onConfirm={handleArchiveConfirm}
        onCancel={handleArchiveCancel}
      />
    </div>
  );
}

export default function App() {
  const isAuthDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true';

  const routes = (
    <Routes>
      <Route path="/" element={<AppLayout />} />
      <Route path="/session/:id" element={<AppLayout />} />
    </Routes>
  );

  // In dev mode with auth disabled, skip OidcSecure wrapper
  if (isAuthDisabled) {
    return routes;
  }

  return <OidcSecure>{routes}</OidcSecure>;
}
