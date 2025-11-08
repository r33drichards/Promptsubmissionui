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

// Message schema - matching existing Message interface
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.coerce.date(), // Coerce strings to Date objects
});

// Session schema - matching existing Session interface
export const SessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  repo: z.string().min(1, 'Repository is required'),
  branch: z.string().min(1, 'Branch is required'),
  targetBranch: z.string().min(1, 'Target branch is required'),
  inboxStatus: InboxStatusSchema,
  uiStatus: UiStatusSchema,
  sessionStatus: SessionStatusSchema,
  createdAt: z.coerce.date(), // Coerce strings to Date objects
  prUrl: z.string().optional(),
  diffStats: z
    .object({
      additions: z.number(),
      deletions: z.number(),
    })
    .optional(),
  messages: z.array(MessageSchema).nullable(),
  children: z.lazy(() => z.array(SessionSchema)).optional(),
  parentId: z.string().nullable(),
  sbxConfig: z.record(z.any()).nullable(),
});

// Array schemas
export const MessagesArraySchema = z.array(MessageSchema);
export const SessionsArraySchema = z.array(SessionSchema);

// Create Session Data schema (for API requests)
export const CreateSessionDataSchema = z.object({
  repo: z.string().trim().min(1, 'Repository is required to create a session'),
  targetBranch: z
    .string()
    .trim()
    .min(1, 'Target branch is required to create a session'),
  messages: z.any().optional(), // Backend expects flexible format
  parentId: z.string().nullable().optional(),
});

// Update Session Data schema (for API requests)
export const UpdateSessionDataSchema = z.object({
  title: z.string().optional(),
  inboxStatus: InboxStatusSchema.optional(),
  uiStatus: UiStatusSchema.optional(),
  prUrl: z.string().optional(),
  diffStats: z
    .object({
      additions: z.number(),
      deletions: z.number(),
    })
    .optional(),
  sessionStatus: SessionStatusSchema.optional(),
  repo: z.string().optional(),
  branch: z.string().optional(),
  targetBranch: z.string().optional(),
});

// Infer TypeScript types from schemas
export type InboxStatus = z.infer<typeof InboxStatusSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type CreateSessionData = z.infer<typeof CreateSessionDataSchema>;
export type UpdateSessionData = z.infer<typeof UpdateSessionDataSchema>;
