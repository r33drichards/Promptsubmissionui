import { Session } from '../types/session';
import { Button as _Button } from './ui/button';
import {
  Collapsible,
  CollapsibleContent as _CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Archive,
  ArchiveRestore,
  Clock,
  Loader2,
  CheckCircle2,
  GitPullRequest,
  GitMerge,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { usePrStatus } from '../hooks/usePrStatus';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface SessionListItemProps {
  session: Session;
  isActive: boolean;
  onSelect: (session: Session) => void;
  onCreateSubtask: (parentId: string) => void;
  onArchive: (sessionId: string) => void;
  onUnarchive?: (sessionId: string) => void;
  level?: number;
}

export function SessionListItem({
  session,
  isActive,
  onSelect,
  onCreateSubtask,
  onArchive,
  onUnarchive,
  level = 0,
}: SessionListItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = session.children && session.children.length > 0;
  const isArchived = session.uiStatus === 'Archived';

  // Fetch PR status from GitHub
  const { prInfo } = usePrStatus(session);

  // Render status indicator based on UI status
  const renderStatusIndicator = () => {
    switch (session.uiStatus) {
      case 'Pending':
        return (
          <div className="flex items-center gap-1" title="Pending">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
        );
      case 'InProgress':
        return (
          <div className="flex items-center gap-1" title="In Progress">
            <Loader2 className="w-4 h-4 text-blue-500" />
          </div>
        );
      case 'NeedsReview':
      case 'NeedsReviewIpReturned':
        return (
          <div className="flex items-center gap-1" title="Needs Review">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
        );
      default:
        return null;
    }
  };

  // Calculate background color based on nesting level
  const getBackgroundColor = () => {
    if (isActive) return 'bg-gray-100';
    if (level === 0) return ''; // Root sessions - default white background
    if (level === 1) return 'bg-gray-50'; // First level children - light gray
    if (level === 2) return 'bg-gray-100'; // Second level children - medium gray
    return 'bg-gray-150'; // Deeper nesting - darker gray
  };

  const getHoverColor = () => {
    if (level === 0) return 'hover:bg-gray-50';
    if (level === 1) return 'hover:bg-gray-100';
    return 'hover:bg-gray-150';
  };

  return (
    <div>
      <div
        className={`group relative flex items-start gap-2 p-3 cursor-pointer transition-colors border-b border-gray-200 ${getBackgroundColor()} ${getHoverColor()} ${
          isActive ? 'border-l-4 border-l-blue-500' : ''
        }`}
        style={{ paddingLeft: `${12 + level * 24}px` }}
      >
        {hasChildren && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <button
                className="flex-shrink-0 mt-0.5 hover:bg-gray-200 rounded p-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </CollapsibleTrigger>
          </Collapsible>
        )}

        <div className="flex-1 min-w-0" onClick={() => onSelect(session)}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {renderStatusIndicator()}
                <h3 className="text-sm truncate">{session.title}</h3>
              </div>
              <p className="text-xs truncate mt-0.5">
                <a
                  href={`https://github.com/${session.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {session.repo}
                </a>
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {session.diffStats && (
                <>
                  <span className="text-xs text-green-600">
                    +{session.diffStats.additions}
                  </span>
                  <span className="text-xs text-red-600">
                    -{session.diffStats.deletions}
                  </span>
                </>
              )}
              {(session.prUrl && session.prStatus) || prInfo?.status ? (
                <>
                  {/* Use prInfo if available, otherwise fall back to session.prStatus */}
                  {(prInfo?.status || session.prStatus) === 'open' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <GitPullRequest className="w-3.5 h-3.5 text-green-600" />
                      </TooltipTrigger>
                      <TooltipContent>PR Open</TooltipContent>
                    </Tooltip>
                  )}
                  {(prInfo?.status || session.prStatus) === 'closed' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <X className="w-3.5 h-3.5 text-red-600" />
                      </TooltipTrigger>
                      <TooltipContent>PR Closed</TooltipContent>
                    </Tooltip>
                  )}
                  {(prInfo?.status || session.prStatus) === 'merged' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <GitMerge className="w-3.5 h-3.5 text-purple-600" />
                      </TooltipTrigger>
                      <TooltipContent>PR Merged</TooltipContent>
                    </Tooltip>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            className="flex-shrink-0 hover:bg-gray-200 rounded p-1"
            onClick={(e) => {
              e.stopPropagation();
              onCreateSubtask(session.id);
            }}
            title="Create subtask"
          >
            <Plus className="w-3 h-3 text-gray-600" />
          </button>
          {isArchived ? (
            onUnarchive && (
              <button
                className="flex-shrink-0 hover:bg-gray-200 rounded p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(
                    '[SessionListItem] Unarchive button clicked for session:',
                    session.id
                  );
                  onUnarchive(session.id);
                }}
                title="Unarchive"
              >
                <ArchiveRestore className="w-3 h-3 text-gray-600" />
              </button>
            )
          ) : (
            <button
              className="flex-shrink-0 hover:bg-gray-200 rounded p-1"
              onClick={(e) => {
                e.stopPropagation();
                console.log(
                  '[SessionListItem] Archive button clicked for session:',
                  session.id
                );
                onArchive(session.id);
              }}
              title="Archive"
            >
              <Archive className="w-3 h-3 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {hasChildren && isOpen && (
        <div>
          {session.children!.map((child) => (
            <SessionListItem
              key={child.id}
              session={child}
              isActive={isActive}
              onSelect={onSelect}
              onCreateSubtask={onCreateSubtask}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
