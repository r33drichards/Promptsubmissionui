import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Session } from '../types/session';

interface ArchiveSessionDialogProps {
  open: boolean;
  session: Session | null;
  onConfirm: (archiveChildren: boolean) => void;
  onCancel: () => void;
}

export function ArchiveSessionDialog({
  open,
  session,
  onConfirm,
  onCancel,
}: ArchiveSessionDialogProps) {
  if (!session) return null;

  const hasChildren = session.children && session.children.length > 0;
  const childCount = session.children?.length || 0;

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Task</AlertDialogTitle>
          <AlertDialogDescription>
            {hasChildren ? (
              <span>
                This task has <strong>{childCount}</strong> subtask
                {childCount === 1 ? '' : 's'}. Would you like to archive the
                subtasks as well?
              </span>
            ) : (
              <span>Are you sure you want to archive this task?</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          {hasChildren ? (
            <>
              <AlertDialogAction
                onClick={() => onConfirm(false)}
                className="bg-gray-600 hover:bg-gray-700"
              >
                Archive Task Only
              </AlertDialogAction>
              <AlertDialogAction onClick={() => onConfirm(true)}>
                Archive with Subtasks
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction onClick={() => onConfirm(false)}>
              Archive
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
