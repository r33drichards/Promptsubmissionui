import { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { Session } from './types/session';
import { SessionListItem } from './components/SessionListItem';
import { SessionDetail } from './components/SessionDetail';
import { CreateTaskForm } from './components/CreateTaskForm';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
import { Plus, Search, Github, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSessions,
  useCreateSession,
  useUpdateSession,
  useArchiveSession,
} from './hooks';

type FilterType = 'active' | 'archived' | 'all';

function AppLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('active');

  // Fetch sessions using TanStack Query
  const { data: sessions = [], isLoading: isLoadingSessions } = useSessions();

  // Mutations
  const createSessionMutation = useCreateSession();
  const updateSessionMutation = useUpdateSession();
  const archiveSessionMutation = useArchiveSession();

  // Derive selectedSession from URL parameter
  const selectedSession = useMemo(() => {
    if (!id) return null;
    return sessions.find(s => s.id === id) || null;
  }, [id, sessions]);

  // Handle invalid session IDs
  useEffect(() => {
    // Only check after sessions have loaded
    if (!isLoadingSessions && id && !selectedSession) {
      toast.error('Session not found');
      navigate('/');
    }
  }, [id, sessions, selectedSession, navigate, isLoadingSessions]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [parentForNewTask, setParentForNewTask] = useState<Session | null>(null);

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

  // Get sorted branches by most recently used
  const sortedBranches = useMemo(() => {
    const branchMap = new Map<string, Date>();
    
    // Track the most recent usage of each branch
    sessions.forEach((session) => {
      const existing = branchMap.get(session.branch);
      if (!existing || session.createdAt > existing) {
        branchMap.set(session.branch, session.createdAt);
      }
    });

    // Sort by most recent usage
    return Array.from(branchMap.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .map(([branch]) => branch);
  }, [sessions]);

  // Build hierarchical structure with filtering
  const hierarchicalSessions = useMemo(() => {
    const sessionMap = new Map<string, Session>();
    const rootSessions: Session[] = [];

    // Filter sessions based on filter type
    let filteredSessions = sessions;
    if (filter === 'active') {
      filteredSessions = sessions.filter((s) => s.sessionStatus === 'Active');
    } else if (filter === 'archived') {
      filteredSessions = sessions.filter((s) => s.sessionStatus === 'Archived');
    }
    // 'all' shows everything

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
  }, [sessions, filter]);

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

  const handleCreateTask = (task: Omit<Session, 'id' | 'createdAt' | 'children'>) => {
    createSessionMutation.mutate(
      {
        title: task.title,
        repo: task.repo,
        branch: task.branch,
        targetBranch: task.targetBranch,
        parentId: task.parentId,
        sbxConfig: task.sbxConfig || undefined,
      },
      {
        onSuccess: (newSession) => {
          navigate(`/session/${newSession.id}`);
          setIsCreatingTask(false);
          setParentForNewTask(null);
        },
      }
    );
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
  };

  const handleCreatePR = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      const prUrl = `https://github.com/${session.repo}/pull/${Math.floor(Math.random() * 1000)}`;
      updateSessionMutation.mutate({
        id: sessionId,
        data: { prUrl },
      });
    }
  };

  const handleOpenInCLI = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      toast.info(`Opening ${session.repo} in CLI...`);
    }
  };

  const handleReply = (sessionId: string, message: string) => {
    // Update the session status to in-progress
    updateSessionMutation.mutate({
      id: sessionId,
      data: { inboxStatus: 'in-progress' },
    });

    // Note: In a real implementation, you would also create the message
    // using useCreateMessage hook, but for now we're just updating the status
    toast.success('Message sent');
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
      <div className="w-96 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              <h1>Claude Code</h1>
            </div>
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
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              New Task
            </Button>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Find a task..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-auto">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-xs text-gray-500">Sessions</span>
              <span className="text-xs text-gray-400">
                {sortedSessions.length} {filter !== 'all' ? filter : 'total'}
              </span>
            </div>

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
                {searchQuery ? 'No tasks found' : 'No tasks yet'}
              </div>
            )}
          </div>
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
            branches={sortedBranches}
          />
        ) : selectedSession ? (
          <SessionDetail
            session={selectedSession}
            onCreatePR={handleCreatePR}
            onReply={handleReply}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center space-y-3">
              <Github className="w-12 h-12 mx-auto text-gray-300" />
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
    <Routes>
      <Route path="/" element={<AppLayout />} />
      <Route path="/session/:id" element={<AppLayout />} />
    </Routes>
  );
}
