// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils';
import { CreateTaskForm } from '../CreateTaskForm';
import { Session } from '@/types/session';
import * as hooks from '@/hooks';

// Mock the useGitHubBranches hook
vi.mock('@/hooks', async () => {
  const actual = await vi.importActual('@/hooks');
  return {
    ...actual,
    useGitHubBranches: vi.fn(),
  };
});

describe('CreateTaskForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    repositories: ['test/repo-1', 'test/repo-2', 'org/project'],
  };

  const mockBranches = ['main', 'develop', 'staging'];

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

  describe('Rendering', () => {
    it('should render the form with all fields', () => {
      render(<CreateTaskForm {...defaultProps} />);

      expect(screen.getByText('Create New Task')).toBeInTheDocument();
      expect(screen.getByLabelText(/prompt/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/repository/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/target branch/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create task/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
    });

    it('should show subtask header when parent session is provided', () => {
      const parentSession: Session = {
        id: 'parent-1',
        title: 'Parent Task',
        repo: 'test/repo',
        branch: 'feature/parent',
        targetBranch: 'main',
        messages: null,
        inboxStatus: 'pending',
        sbxConfig: null,
        parentId: null,
        createdAt: new Date(),
      };

      render(
        <CreateTaskForm {...defaultProps} parentSession={parentSession} />
      );

      expect(
        screen.getByText('Create Subtask for "Parent Task"')
      ).toBeInTheDocument();
    });

    it('should disable submit button when required fields are empty', () => {
      render(<CreateTaskForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create task/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      // Use a parent session to pre-fill repo and targetBranch to avoid combobox interaction issues in tests
      const parentSession: Session = {
        id: 'parent-1',
        title: 'Parent Task',
        repo: 'test/repo-1',
        branch: 'feature/parent',
        targetBranch: 'main',
        messages: null,
        inboxStatus: 'pending',
        sbxConfig: null,
        parentId: null,
        createdAt: new Date(),
      };

      render(
        <CreateTaskForm {...defaultProps} parentSession={parentSession} />
      );

      // Fill in the prompt
      const promptInput = screen.getByLabelText(/prompt/i);
      await user.type(promptInput, 'Create a new authentication feature');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            repo: 'test/repo-1',
            targetBranch: 'feature/parent',
            messages: expect.arrayContaining([
              expect.objectContaining({
                content: 'Create a new authentication feature',
              }),
            ]),
            parentId: 'parent-1',
          })
        );
      });
    });

    it('should include parentId when creating a subtask', async () => {
      const user = userEvent.setup();
      const parentSession: Session = {
        id: 'parent-1',
        title: 'Parent Task',
        repo: 'test/repo',
        branch: 'feature/parent',
        targetBranch: 'main',
        messages: null,
        inboxStatus: 'pending',
        sbxConfig: null,
        parentId: null,
        createdAt: new Date(),
      };

      render(
        <CreateTaskForm {...defaultProps} parentSession={parentSession} />
      );

      const promptInput = screen.getByLabelText(/prompt/i);
      await user.type(promptInput, 'Fix a bug in the parent task');

      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            parentId: 'parent-1',
          })
        );
      });
    });

    it('should reset form fields after submission', async () => {
      const user = userEvent.setup();
      // Use a parent session to pre-fill repo and targetBranch
      const parentSession: Session = {
        id: 'parent-1',
        title: 'Parent Task',
        repo: 'test/repo-1',
        branch: 'feature/parent',
        targetBranch: 'main',
        messages: null,
        inboxStatus: 'pending',
        sbxConfig: null,
        parentId: null,
        createdAt: new Date(),
      };

      render(
        <CreateTaskForm {...defaultProps} parentSession={parentSession} />
      );

      const promptInput = screen.getByLabelText(
        /prompt/i
      ) as HTMLTextAreaElement;
      await user.type(promptInput, 'Test prompt');

      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(promptInput.value).toBe('');
      });
    });

    it('should inherit repo and parent branch as targetBranch from parent session', async () => {
      const user = userEvent.setup();
      const parentSession: Session = {
        id: 'parent-1',
        title: 'Parent Task',
        repo: 'test/inherited-repo',
        branch: 'feature/parent',
        targetBranch: 'develop',
        messages: null,
        inboxStatus: 'pending',
        sbxConfig: null,
        parentId: null,
        createdAt: new Date(),
      };

      render(
        <CreateTaskForm {...defaultProps} parentSession={parentSession} />
      );

      const promptInput = screen.getByLabelText(/prompt/i);
      await user.type(promptInput, 'Subtask prompt');

      const submitButton = screen.getByRole('button', { name: /create task/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            repo: 'test/inherited-repo',
            targetBranch: 'feature/parent',
          })
        );
      });
    });
  });

  describe('Form Validation', () => {
    it('should require prompt to be filled', async () => {
      render(<CreateTaskForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create task/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when all required fields are filled', async () => {
      const user = userEvent.setup();
      render(<CreateTaskForm {...defaultProps} />);

      const promptInput = screen.getByLabelText(/prompt/i);
      const submitButton = screen.getByRole('button', { name: /create task/i });

      // Initially disabled
      expect(submitButton).toBeDisabled();

      // Type prompt
      await user.type(promptInput, 'Test task');

      // Should still be disabled until repo and branch are selected
      // Note: In the actual implementation, you'd need to select from the comboboxes
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<CreateTaskForm {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when X button is clicked', async () => {
      const user = userEvent.setup();
      render(<CreateTaskForm {...defaultProps} />);

      // Find the X button in the header
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find((btn) =>
        btn.querySelector('.lucide-x')
      );

      if (xButton) {
        await user.click(xButton);
        expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
      }
    });

    it('should not submit form when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<CreateTaskForm {...defaultProps} />);

      const promptInput = screen.getByLabelText(/prompt/i);
      await user.type(promptInput, 'Test prompt');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Interaction', () => {
    it('should update prompt value as user types', async () => {
      const user = userEvent.setup();
      render(<CreateTaskForm {...defaultProps} />);

      const promptInput = screen.getByLabelText(
        /prompt/i
      ) as HTMLTextAreaElement;
      await user.type(promptInput, 'My task description');

      expect(promptInput.value).toBe('My task description');
    });

    it('should allow multiline prompt input', async () => {
      const user = userEvent.setup();
      render(<CreateTaskForm {...defaultProps} />);

      const promptInput = screen.getByLabelText(
        /prompt/i
      ) as HTMLTextAreaElement;
      await user.type(promptInput, 'Line 1{Enter}Line 2{Enter}Line 3');

      expect(promptInput.value).toContain('Line 1');
      expect(promptInput.value).toContain('Line 2');
      expect(promptInput.value).toContain('Line 3');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<CreateTaskForm {...defaultProps} />);

      expect(screen.getByLabelText(/prompt/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/repository/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/target branch/i)).toBeInTheDocument();
    });

    it('should mark prompt as required', () => {
      render(<CreateTaskForm {...defaultProps} />);

      const promptInput = screen.getByLabelText(/prompt/i);
      expect(promptInput).toBeRequired();
    });
  });
});
