import { z } from 'zod';

// Enums - matching existing types
export const InboxStatusSchema = z.enum([
  'pending',
  'in-progress',
  'completed',
  'failed',
  'needs-review',
  'needs-review-ip-returned',
]);
export const SessionStatusSchema = z.enum([
  'Active',
  'Archived',
  'ReturningIp',
]);
export const UiStatusSchema = z.enum([
  'Pending',
  'InProgress',
  'NeedsReview',
  'NeedsReviewIpReturned',
  'Archived',
]);

// Message schema - using snake_case to match backend API
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  created_at: z.coerce.date(), // Coerce strings to Date objects
});

// Session schema - using snake_case to match backend API
export const SessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  repo: z.string().min(1, 'Repository is required'),
  branch: z.string().min(1, 'Branch is required'),
  target_branch: z.string().min(1, 'Target branch is required'),
  inbox_status: InboxStatusSchema,
  ui_status: UiStatusSchema,
  session_status: SessionStatusSchema,
  created_at: z.coerce.date(), // Coerce strings to Date objects
  pr_url: z.string().optional(),
  diff_stats: z
    .object({
      additions: z.number(),
      deletions: z.number(),
    })
    .optional(),
  messages: z.array(MessageSchema).nullable(),
  children: z.lazy(() => z.array(SessionSchema)).optional(),
  parent: z.string().nullable(),
  sbx_config: z.record(z.any()).nullable(),
});

// Array schemas
export const MessagesArraySchema = z.array(MessageSchema);
export const SessionsArraySchema = z.array(SessionSchema);

// Create Session Data schema (for API requests) - using snake_case to match backend API
export const CreateSessionDataSchema = z.object({
  repo: z.string().trim().min(1, 'Repository is required to create a session'),
  target_branch: z
    .string()
    .trim()
    .min(1, 'Target branch is required to create a session'),
  messages: z.any().optional(), // Backend expects flexible format
  parent: z.string().nullable().optional(),
});

// Update Session Data schema (for API requests) - using snake_case to match backend API
export const UpdateSessionDataSchema = z.object({
  title: z.string().optional(),
  inbox_status: InboxStatusSchema.optional(),
  ui_status: UiStatusSchema.optional(),
  pr_url: z.string().optional(),
  diff_stats: z
    .object({
      additions: z.number(),
      deletions: z.number(),
    })
    .optional(),
  session_status: SessionStatusSchema.optional(),
  repo: z.string().optional(),
  branch: z.string().optional(),
  target_branch: z.string().optional(),
});

// Prompt schema - using snake_case to match backend API
export const PromptSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  content: z.string(),
  created_at: z.coerce.date(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
});

// Infer TypeScript types from schemas
export type InboxStatus = z.infer<typeof InboxStatusSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type CreateSessionData = z.infer<typeof CreateSessionDataSchema>;
export type UpdateSessionData = z.infer<typeof UpdateSessionDataSchema>;
export type Prompt = z.infer<typeof PromptSchema>;
