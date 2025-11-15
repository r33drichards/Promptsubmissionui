import { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
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
import { useSessions, useCreateSession, useArchiveSession } from './hooks';

type FilterType = 'pending' | 'in-progress' | 'needs-review' | 'archived';

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

function AppLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<FilterType[]>(() => {
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

  // Persist session filters state
  useEffect(() => {
    window.localStorage.setItem('sessionFilters', JSON.stringify(filters));
  }, [filters]);

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

    // If no filters selected, show all sessions
    if (filters.length === 0) {
      // First pass: create a map of all sessions
      sessions.forEach((session) => {
        sessionMap.set(session.id, { ...session, children: [] });
      });

      // Second pass: build hierarchy
      sessions.forEach((session) => {
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

  // Sort sessions by created date (newest first)
  const filteredSessions = useMemo(() => {
    const sortByDate = (sessions: Session[]): Session[] => {
      return sessions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((session) => ({
          ...session,
          children: session.children ? sortByDate(session.children) : [],
        }));
    };

    return sortByDate([...hierarchicalSessions]);
  }, [hierarchicalSessions]);

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
    // Don't navigate - stay on current URL
  };

  const _handleOpenInCLI = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      toast.info(`Opening ${session.repo} in CLI...`);
    }
  };

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
            <div className="p-4 border-b space-y-2">
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
              <div className="w-full">
                <MultiSelect
                  options={filterOptions}
                  selected={filters}
                  onChange={(newFilters) => setFilters(newFilters as FilterType[])}
                  placeholder="Filter sessions..."
                  className="h-6 text-xs w-full"
                />
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
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No tasks yet
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
            repositories={sortedRepositories}
            isSubmitting={createSessionMutation.isPending}
          />
        ) : selectedSession ? (
          <SessionDetail session={selectedSession} />
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
