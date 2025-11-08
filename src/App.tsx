import { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { OidcSecure, useOidc } from '@axa-fr/react-oidc';
import { Session, UiStatus } from './types/session';
import { CreateSessionData } from './services/api/types';
import { SessionListItem } from './components/SessionListItem';
import { SessionDetail } from './components/SessionDetail';
import { CreateTaskForm } from './components/CreateTaskForm';
import { Button } from './components/ui/button';

import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
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
  LogOut,
  CircleUser,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSessions, useCreateSession, useArchiveSession } from './hooks';

// Helper function to get user-friendly tab labels
function getTabLabel(status: UiStatus): string {
  switch (status) {
    case 'Pending':
      return 'Pending';
    case 'InProgress':
      return 'In Progress';
    case 'NeedsReview':
      return 'Needs Review';
    case 'NeedsReviewIpReturned':
      return 'Reviewed';
    case 'Archived':
      return 'Archived';
  }
}

function AppLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useOidc();
  const [activeTab, setActiveTab] = useState<UiStatus>('InProgress');

  // Fetch sessions using TanStack Query
  const { data: sessions = [], isLoading: isLoadingSessions } = useSessions();

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

  const [searchQuery] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [parentForNewTask, setParentForNewTask] = useState<Session | null>(
    null
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = window.localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Persist sidebar collapsed state
  useEffect(() => {
    window.localStorage.setItem(
      'sidebarCollapsed',
      JSON.stringify(sidebarCollapsed)
    );
  }, [sidebarCollapsed]);

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

    // Filter sessions based on active tab (uiStatus)
    const filteredSessions = sessions.filter((s) => s.uiStatus === activeTab);

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
  }, [sessions, activeTab]);

  // Sort sessions by created date (newest first)
  const sortedSessions = useMemo(() => {
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

  // Filter sessions based on search
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sortedSessions;

    const filterRecursive = (sessions: Session[]): Session[] => {
      return sessions
        .filter(
          (session) =>
            session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.repo.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map((session) => ({
          ...session,
          children: session.children ? filterRecursive(session.children) : [],
        }));
    };

    return filterRecursive(sortedSessions);
  }, [sortedSessions, searchQuery]);

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
    console.log('[App] archiveSessionMutation:', archiveSessionMutation);
    archiveSessionMutation.mutate(sessionId, {
      onSuccess: () => {
        console.log('[App] Archive mutation succeeded');
        if (selectedSession?.id === sessionId) {
          navigate('/');
        }
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
            <div className="p-4 border-b">
              <div className="flex gap-2 items-center">
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
                <Button
                  size="sm"
                  onClick={() => {
                    setParentForNewTask(null);
                    navigate('/');
                    setIsCreatingTask(true);
                  }}
                  disabled={createSessionMutation.isPending}
                  className="ml-auto"
                >
                  {createSessionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 " />
                  )}
                </Button>
              </div>
            </div>

            {/* Tabs for filtering by UI Status */}
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as UiStatus)}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-4 pt-2">
                <TabsList className="w-full grid grid-cols-3 h-auto p-1">
                  <TabsTrigger value="Pending" className="text-xs px-1 py-1">
                    {getTabLabel('Pending')}
                  </TabsTrigger>
                  <TabsTrigger value="InProgress" className="text-xs px-1 py-1">
                    {getTabLabel('InProgress')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="NeedsReview"
                    className="text-xs px-1 py-1"
                  >
                    {getTabLabel('NeedsReview')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="NeedsReviewIpReturned"
                    className="text-xs px-1 py-1"
                  >
                    {getTabLabel('NeedsReviewIpReturned')}
                  </TabsTrigger>
                  <TabsTrigger value="Archived" className="text-xs px-1 py-1">
                    {getTabLabel('Archived')}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Content - Sessions List */}
              {(
                [
                  'Pending',
                  'InProgress',
                  'NeedsReview',
                  'NeedsReviewIpReturned',
                  'Archived',
                ] as UiStatus[]
              ).map((status) => (
                <TabsContent
                  key={status}
                  value={status}
                  className="flex-1 overflow-auto m-0"
                >
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
                          onSelect={(session) =>
                            navigate(`/session/${session.id}`)
                          }
                          onCreateSubtask={handleCreateSubtask}
                          onArchive={handleArchive}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        {searchQuery ? 'No tasks found' : 'No tasks yet'}
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
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
            {isAuthenticated && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => logout()}
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
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
    </div>
  );
}

export default function App() {
  return (
    <OidcSecure>
      <Routes>
        <Route path="/" element={<AppLayout />} />
        <Route path="/session/:id" element={<AppLayout />} />
      </Routes>
    </OidcSecure>
  );
}
