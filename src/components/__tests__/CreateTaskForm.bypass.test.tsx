import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils';
import { CreateTaskForm } from '../CreateTaskForm';
import * as hooks from '@/hooks';

// Mock the useGitHubBranches hook
vi.mock('@/hooks', async () => {
  const actual = await vi.importActual('@/hooks');
  return {
    ...actual,
    useGitHubBranches: vi.fn(),
  };
});

describe('CreateTaskForm - Bypass Attempts', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    repositories: ['test/repo-1', 'test/repo-2'],
  };

  const mockBranches = ['main', 'develop'];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation - returns branches for any repo
    vi.mocked(hooks.useGitHubBranches).mockReturnValue({
      branches: mockBranches,
      branchData: [],
      defaultBranch: 'main',
      isLoading: false,
      error: null,
    });
  });

  it('should NOT submit when pressing Enter in prompt textarea with empty repo', async () => {
    const user = userEvent.setup();
    render(<CreateTaskForm {...defaultProps} />);

    // Fill in only the prompt
    const promptInput = screen.getByLabelText(/prompt/i);
    await user.type(promptInput, 'Test task');

    // Try to submit by pressing Enter (Ctrl+Enter or Cmd+Enter might work in some textareas)
    await user.keyboard('{Control>}{Enter}{/Control}');

    // onSubmit should NOT have been called because repo is empty
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('should NOT submit when pressing Enter in prompt textarea with empty targetBranch', async () => {
    const user = userEvent.setup();

    // Create a form with a parent that has repo but we'll clear targetBranch
    const parentWithEmptyBranch = {
      id: 'parent-1',
      title: 'Parent Task',
      repo: 'test/repo',
      branch: 'feature/parent',
      targetBranch: '', // Empty target branch
      messages: null,
      inboxStatus: 'pending' as const,
      sbxConfig: null,
      parentId: null,
      createdAt: new Date(),
      sessionStatus: 'Active' as const,
    };

    render(
      <CreateTaskForm {...defaultProps} parentSession={parentWithEmptyBranch} />
    );

    // Fill in the prompt
    const promptInput = screen.getByLabelText(/prompt/i);
    await user.type(promptInput, 'Test task');

    // Try to submit by pressing Enter
    await user.keyboard('{Control>}{Enter}{/Control}');

    // onSubmit should NOT have been called because targetBranch is empty
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('should NOT allow form submission with empty repo even if validation is bypassed', async () => {
    const user = userEvent.setup();
    render(<CreateTaskForm {...defaultProps} />);

    const promptInput = screen.getByLabelText(/prompt/i);
    await user.type(promptInput, 'Test task');

    // Get the form element and try to submit it directly
    const form = promptInput.closest('form');
    expect(form).toBeInTheDocument();

    // Dispatch a submit event directly to the form (bypassing button disabled state)
    const submitEvent = new Event('submit', {
      bubbles: true,
      cancelable: true,
    });
    form?.dispatchEvent(submitEvent);

    // The form's handleSubmit should prevent submission
    await waitFor(() => {
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  it('should show what gets passed to onSubmit when repo and targetBranch are empty strings', async () => {
    const onSubmitSpy = vi.fn();
    const user = userEvent.setup();

    render(<CreateTaskForm {...defaultProps} onSubmit={onSubmitSpy} />);

    const promptInput = screen.getByLabelText(/prompt/i);
    await user.type(promptInput, 'Test task');

    // Get current state of form fields by checking button disabled state
    const createButton = screen.getByRole('button', { name: /create task/i });

    // If button is disabled, that's good - form validation is working
    expect(createButton).toBeDisabled();

    // Try to force submit by dispatching form submit event
    const form = promptInput.closest('form');
    if (form) {
      const submitEvent = new Event('submit', {
        bubbles: true,
        cancelable: true,
      });
      form.dispatchEvent(submitEvent);
    }

    // Verify onSubmit was NOT called
    expect(onSubmitSpy).not.toHaveBeenCalled();
  });

  it('should log what actually gets submitted when form state has empty values', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const onSubmitSpy = vi.fn();

    render(<CreateTaskForm {...defaultProps} onSubmit={onSubmitSpy} />);

    // Fill in prompt
    const promptInput = screen.getByLabelText(/prompt/i) as HTMLTextAreaElement;
    const user = userEvent.setup();
    await user.type(promptInput, 'Test task');

    // Try to submit the form programmatically
    const form = promptInput.closest('form') as HTMLFormElement;
    await act(async () => {
      form.requestSubmit();
    });

    // Check console errors - now logs validation errors as an object
    await waitFor(() => {
      // Check if console.error was called at all
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Find the call that matches our validation error
      const validationErrorCall = consoleErrorSpy.mock.calls.find(
        (call) => call[0] === '[CreateTaskForm] Validation failed:'
      );

      expect(validationErrorCall).toBeDefined();
      expect(validationErrorCall?.[1]).toMatchObject({
        repo: 'Repository is required',
      });
    });

    // Verify onSubmit was NOT called
    expect(onSubmitSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
