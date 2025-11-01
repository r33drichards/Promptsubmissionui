import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Session } from '../types/session';
import { RepositoryCombobox } from './RepositoryCombobox';
import { BranchCombobox } from './BranchCombobox';
import { X } from 'lucide-react';

interface CreateTaskFormProps {
  onSubmit: (task: Omit<Session, 'id' | 'createdAt' | 'children'>) => void;
  onCancel: () => void;
  parentSession?: Session | null;
  repositories: string[];
  branches: string[];
}

export function CreateTaskForm({
  onSubmit,
  onCancel,
  parentSession,
  repositories,
  branches,
}: CreateTaskFormProps) {
  const [title, setTitle] = useState('');
  const [repo, setRepo] = useState(parentSession?.repo || '');
  const [targetBranch, setTargetBranch] = useState(parentSession?.targetBranch || 'main');
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      repo,
      branch: '', // Will be auto-generated
      targetBranch,
      messages: prompt
        ? [
            {
              id: `m-${Date.now()}`,
              role: 'user',
              content: prompt,
              timestamp: new Date(),
            },
          ]
        : null,
      inboxStatus: 'pending',
      sbxConfig: null,
      parentId: parentSession?.id || null,
    });
    setTitle('');
    setRepo('');
    setTargetBranch('main');
    setPrompt('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex items-center justify-between">
        <h2>
          {parentSession ? `Create Subtask for "${parentSession.title}"` : 'Create New Task'}
        </h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-6 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Deploy multi-mcp project to virtual machines"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repo">Repository</Label>
              <RepositoryCombobox
                value={repo}
                onChange={setRepo}
                repositories={repositories}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetBranch">Target Branch (for PR)</Label>
              <BranchCombobox value={targetBranch} onChange={setTargetBranch} branches={branches} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt (Optional)</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want Claude Code to do..."
                className="min-h-[200px]"
              />
            </div>
          </div>
        </div>

        <div className="border-t p-4 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title || !repo || !targetBranch}>
            Create Task
          </Button>
        </div>
      </form>
    </div>
  );
}
