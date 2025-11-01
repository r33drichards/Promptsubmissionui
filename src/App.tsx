import { useState, useMemo } from 'react';
import { Session } from './types/session';
import { mockSessions } from './data/mockSessions';
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
import { Plus, Search, Github } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useApi } from './providers/ApiProvider';

type FilterType = 'active' | 'archived' | 'all';

export default function App() {
  // Access the backend API client via dependency injection
  const api = useApi();

  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [parentForNewTask, setParentForNewTask] = useState<Session | null>(null);
  const [filter, setFilter] = useState<FilterType>('active');

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
      filteredSessions = sessions.filter((s) => !s.archived);
    } else if (filter === 'archived') {
      filteredSessions = sessions.filter((s) => s.archived);
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

  // Filter sessions based on search
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return hierarchicalSessions;

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

    return filterRecursive(hierarchicalSessions);
  }, [hierarchicalSessions, searchQuery]);

  const handleCreateTask = async (task: Omit<Session, 'id' | 'createdAt' | 'children'>) => {
    try {
      // Example: Create session via backend API
      // The mock client will return a mock response for now
      const newSession = await api.sessions.create({
        title: task.title,
        repo: task.repo,
        branch: task.branch,
        targetBranch: task.targetBranch,
        parentId: task.parentId,
        sbxConfig: task.sbxConfig || undefined,
      });

      // Update local state with the created session
      setSessions([...sessions, newSession]);
      setSelectedSession(newSession);
      setIsCreatingTask(false);
      setParentForNewTask(null);
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleCreateSubtask = (parentId: string) => {
    const parent = sessions.find((s) => s.id === parentId);
    setParentForNewTask(parent || null);
    setSelectedSession(null);
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
      setSessions(
        sessions.map((s) =>
          s.id === sessionId
            ? { ...s, prUrl }
            : s
        )
      );
      toast.success('Pull request created successfully');
    }
  };

  const handleOpenInCLI = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      toast.info(`Opening ${session.repo} in CLI...`);
    }
  };

  const handleReply = (sessionId: string, message: string) => {
    setSessions(
      sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: [
                ...(s.messages || []),
                {
                  id: `m-${Date.now()}`,
                  role: 'user' as const,
                  content: message,
                  timestamp: new Date(),
                },
              ],
              inboxStatus: 'in-progress' as const,
            }
          : s
      )
    );
    toast.success('Message sent');
  };

  const handleArchive = async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      try {
        // Example: Archive session via backend API
        await api.sessions.archive(sessionId);

        // Update local state
        setSessions(
          sessions.map((s) =>
            s.id === sessionId ? { ...s, archived: true } : s
          )
        );
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
        }
        toast.success('Task archived');
      } catch (error) {
        console.error('Failed to archive task:', error);
        toast.error('Failed to archive task');
      }
    }
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
                setSelectedSession(null);
                setIsCreatingTask(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
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
                {hierarchicalSessions.length} {filter !== 'all' ? filter : 'total'}
              </span>
            </div>
            
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  isActive={selectedSession?.id === session.id}
                  onSelect={setSelectedSession}
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
                  setSelectedSession(null);
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
