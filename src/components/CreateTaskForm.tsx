import { useState } from 'react';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Session } from '../types/session';
import { CreateSessionData } from '../services/api/types';
import { RepositoryCombobox } from './RepositoryCombobox';
import { BranchCombobox } from './BranchCombobox';
import { MonacoEditor } from './MonacoEditor';
import { X } from 'lucide-react';

interface CreateTaskFormProps {
  onSubmit: (task: CreateSessionData) => void;
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
  const [repo, setRepo] = useState(parentSession?.repo || '');
  const [targetBranch, setTargetBranch] = useState(parentSession?.branch || 'main');
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields before submission
    if (!prompt.trim()) {
      console.error('[CreateTaskForm] Prompt is required');
      return;
    }
    if (!repo.trim()) {
      console.error('[CreateTaskForm] Repository is required');
      return;
    }
    if (!targetBranch.trim()) {
      console.error('[CreateTaskForm] Target branch is required');
      return;
    }

    console.log('[CreateTaskForm] Submitting with:', { repo, targetBranch, prompt });
    onSubmit({
      repo,
      targetBranch,
      messages: { content: prompt }, // Send as JSON object to match backend API
      parentId: parentSession?.id || null,
    });
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
        <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
          {/* Repository and Target Branch in flex-row at the top */}
          <div className="flex flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="repo" className="text-sm">Repository</Label>
              <RepositoryCombobox
                id="repo"
                value={repo}
                onChange={(newRepo) => {
                  console.log('[CreateTaskForm] RepositoryCombobox onChange called with:', newRepo);
                  setRepo(newRepo);
                }}
                repositories={repositories}
              />
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="targetBranch" className="text-sm">
                Target Branch (for PR)
                {parentSession && (
                  <span className="text-muted-foreground text-xs ml-2">(inherited from parent)</span>
                )}
              </Label>
              {parentSession ? (
                <Input
                  id="targetBranch"
                  value={targetBranch}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              ) : (
                <BranchCombobox id="targetBranch" value={targetBranch} onChange={setTargetBranch} branches={branches} />
              )}
            </div>
          </div>

          {/* Monaco Editor for Prompt - fills remaining space */}
          <div className="flex-1 flex flex-col space-y-2 min-h-0">
            <Label htmlFor="prompt">Prompt</Label>
            <div className="flex-1 min-h-0">
              <MonacoEditor
                value={prompt}
                onChange={(value) => setPrompt(value || '')}
                placeholder="Describe what you want Claude Code to do..."
                height="100%"
              />
            </div>
          </div>
        </div>

        <div className="border-t p-4 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!prompt || !repo || !targetBranch}>
            Create Task
          </Button>
        </div>
      </form>
    </div>
  );
}
