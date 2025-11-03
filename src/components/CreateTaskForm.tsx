import { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Session } from '../types/session';
import { CreateSessionData } from '../services/api/types';
import { RepositoryCombobox } from './RepositoryCombobox';
import { BranchCombobox } from './BranchCombobox';
import { MonacoEditor } from './MonacoEditor';
import { useGitHubBranches } from '../hooks';
import { X, Loader2 } from 'lucide-react';

interface CreateTaskFormProps {
  onSubmit: (task: CreateSessionData) => void;
  onCancel: () => void;
  parentSession?: Session | null;
  repositories: string[];
}

export function CreateTaskForm({
  onSubmit,
  onCancel,
  parentSession,
  repositories,
}: CreateTaskFormProps) {
  const [repo, setRepo] = useState(parentSession?.repo || '');
  const [targetBranch, setTargetBranch] = useState(parentSession?.branch || 'main');
  const [prompt, setPrompt] = useState('');

  // Fetch branches from GitHub API based on selected repository
  const { branches, isLoading: isLoadingBranches, error: branchesError } = useGitHubBranches(repo);

  // Update targetBranch when branches are loaded and current value is not in the list
  useEffect(() => {
    if (branches.length > 0 && !parentSession) {
      // If current targetBranch is not in the list, default to 'main', 'master', or first branch
      if (!branches.includes(targetBranch)) {
        const defaultBranch = branches.includes('main')
          ? 'main'
          : branches.includes('master')
          ? 'master'
          : branches[0];
        setTargetBranch(defaultBranch);
      }
    }
  }, [branches, targetBranch, parentSession]);

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
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
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
                <>
                  <BranchCombobox
                    id="targetBranch"
                    value={targetBranch}
                    onChange={setTargetBranch}
                    branches={branches}
                    disabled={isLoadingBranches || !repo}
                  />
                  {isLoadingBranches && repo && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading branches...
                    </div>
                  )}
                  {branchesError && (
                    <div className="text-xs text-red-600">
                      {branchesError}
                    </div>
                  )}
                  {!repo && (
                    <div className="text-xs text-muted-foreground">
                      Select a repository first
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Monaco Editor for Prompt - fills remaining space */}
          <div className="flex-1 space-y-2 overflow-hidden">
            <Label htmlFor="prompt">Prompt</Label>
            <MonacoEditor
              value={prompt}
              onChange={(value) => setPrompt(value || '')}
              placeholder="Describe what you want Claude Code to do..."
            />
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
