import { useState, useEffect } from 'react';
import { z } from 'zod';
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

// Zod schema for form validation
const createTaskFormSchema = z.object({
  repo: z.string().trim().min(1, 'Repository is required'),
  targetBranch: z.string().trim().min(1, 'Target branch is required'),
  prompt: z.string().trim().min(1, 'Prompt is required'),
});

interface CreateTaskFormProps {
  onSubmit: (task: CreateSessionData) => void;
  onCancel: () => void;
  parentSession?: Session | null;
  repositories: string[];
  isSubmitting?: boolean;
}

// Infer the type from the schema
type CreateTaskFormData = z.infer<typeof createTaskFormSchema>;

export function CreateTaskForm({
  onSubmit,
  onCancel,
  parentSession,
  repositories,
  isSubmitting = false,
}: CreateTaskFormProps) {
  const [repo, setRepo] = useState(parentSession?.repo || '');
  const [targetBranch, setTargetBranch] = useState(parentSession?.branch || '');
  const [prompt, setPrompt] = useState('');
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateTaskFormData, string>>
  >({});

  // Fetch branches from GitHub API based on selected repository
  const {
    branches,
    defaultBranch,
    isLoading: isLoadingBranches,
    error: branchesError,
  } = useGitHubBranches(repo);

  // Update targetBranch when repository changes and default branch is loaded
  useEffect(() => {
    if (defaultBranch && !parentSession && !targetBranch) {
      // Use GitHub's configured default branch
      setTargetBranch(defaultBranch);
    }
  }, [defaultBranch, parentSession, targetBranch]);

  // Handle Escape key to close the form
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    console.log('[CreateTaskForm] handleSubmit called with state:', {
      repo,
      targetBranch,
      prompt,
      repoLength: repo.length,
      targetBranchLength: targetBranch.length,
      promptLength: prompt.length,
    });

    // Parse and validate form data using Zod (parse don't validate)
    const result = createTaskFormSchema.safeParse({
      repo,
      targetBranch,
      prompt,
    });

    if (!result.success) {
      // Extract field-specific errors from Zod validation
      const fieldErrors: Partial<Record<keyof CreateTaskFormData, string>> = {};

      // Zod errors are in the 'issues' property
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CreateTaskFormData;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });

      setErrors(fieldErrors);
      console.error('[CreateTaskForm] Validation failed:', fieldErrors);
      return;
    }

    // Clear errors on successful validation
    setErrors({});

    // Use the parsed (validated and typed) data
    const validatedData = result.data;
    console.log('[CreateTaskForm] Submitting with:', validatedData);

    onSubmit({
      repo: validatedData.repo,
      target_branch: validatedData.targetBranch,
      messages: [{ content: validatedData.prompt }], // Send as array to match backend API
      parent: parentSession?.id || null,
    });

    setRepo('');
    setTargetBranch('main');
    setPrompt('');
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
            <p className="text-sm text-gray-600">Creating task...</p>
          </div>
        </div>
      )}

      <div className="border-b p-4 flex items-center justify-between">
        <h2>
          {parentSession
            ? `Create Subtask for "${parentSession.title}"`
            : 'Create New Task'}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Repository and Target Branch in flex-row at the top */}
          <div className="flex flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="repo" className="text-sm">
                Repository
              </Label>
              <RepositoryCombobox
                id="repo"
                value={repo}
                onChange={(newRepo) => {
                  console.log(
                    '[CreateTaskForm] RepositoryCombobox onChange called with:',
                    newRepo
                  );
                  setRepo(newRepo);
                  // Clear error when user starts typing
                  if (errors.repo) {
                    setErrors((prev) => ({ ...prev, repo: undefined }));
                  }
                  // Reset targetBranch when repo changes so useEffect can set it to the new repo's default
                  if (!parentSession) {
                    setTargetBranch('');
                  }
                }}
                repositories={repositories}
              />
              {errors.repo && (
                <div className="text-xs text-red-600">{errors.repo}</div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="targetBranch" className="text-sm">
                Target Branch
                {parentSession && (
                  <span className="text-muted-foreground text-xs ml-2">
                    (inherited from parent)
                  </span>
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
                    onChange={(newBranch) => {
                      setTargetBranch(newBranch);
                      // Clear error when user starts typing
                      if (errors.targetBranch) {
                        setErrors((prev) => ({
                          ...prev,
                          targetBranch: undefined,
                        }));
                      }
                    }}
                    branches={branches}
                    disabled={isLoadingBranches || !repo}
                  />
                  {errors.targetBranch && (
                    <div className="text-xs text-red-600">
                      {errors.targetBranch}
                    </div>
                  )}
                  {isLoadingBranches && repo && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading branches...
                    </div>
                  )}
                  {branchesError && (
                    <div className="text-xs text-red-600">{branchesError}</div>
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
              onChange={(value) => {
                setPrompt(value || '');
                // Clear error when user starts typing
                if (errors.prompt) {
                  setErrors((prev) => ({ ...prev, prompt: undefined }));
                }
              }}
              onSubmit={() => handleSubmit()}
              placeholder="Describe what you want Claude Code to do..."
            />
            {errors.prompt && (
              <div className="text-xs text-red-600">{errors.prompt}</div>
            )}
          </div>
        </div>

        <div className="border-t p-4 flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!prompt || !repo || !targetBranch || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Task'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
