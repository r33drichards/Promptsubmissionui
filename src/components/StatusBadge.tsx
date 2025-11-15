import { Badge } from './ui/badge';
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { cn } from './ui/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({
  status,
  className,
  showIcon = true,
}: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/[_-]/g, '');

    switch (normalizedStatus) {
      case 'pending':
        return {
          label: 'Pending',
          icon: Clock,
          className: 'bg-gray-50 text-gray-700 border-gray-300',
          iconClassName: 'animate-pulse',
        };
      case 'inprogress':
        return {
          label: 'In Progress',
          icon: Loader2,
          className: 'bg-blue-50 text-blue-700 border-blue-300',
          iconClassName: 'animate-spin',
        };
      case 'completed':
        return {
          label: 'Completed',
          icon: CheckCircle2,
          className: 'bg-green-50 text-green-700 border-green-300',
          iconClassName: '',
        };
      case 'failed':
        return {
          label: 'Failed',
          icon: XCircle,
          className: 'bg-red-50 text-red-700 border-red-300',
          iconClassName: 'animate-pulse',
        };
      case 'needsreview':
      case 'needsreviewipreturned':
        return {
          label: 'Needs Review',
          icon: Eye,
          className: 'bg-yellow-50 text-yellow-700 border-yellow-300',
          iconClassName: '',
        };
      default:
        return {
          label: status,
          icon: AlertCircle,
          className: 'bg-gray-50 text-gray-700 border-gray-300',
          iconClassName: '',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1.5 font-medium',
        config.className,
        className
      )}
    >
      {showIcon && <Icon className={cn('w-3 h-3', config.iconClassName)} />}
      <span>{config.label}</span>
    </Badge>
  );
}
