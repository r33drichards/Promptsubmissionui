import { Session } from '../types/session';
import { Badge } from './ui/badge';
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
} from 'lucide-react';
import { useState } from 'react';

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

  return (
    <div>
      <div
        className={`group relative flex items-start gap-2 p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-200 ${
          isActive ? 'bg-gray-100 border-l-4 border-l-blue-500' : ''
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
              {session.prUrl && (
                <Badge
                  variant="outline"
                  className="text-xs bg-green-50 text-green-700 border-green-300"
                >
                  Open
                </Badge>
              )}
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
