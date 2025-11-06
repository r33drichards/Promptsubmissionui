import { Session } from '../types/session';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ExternalLink,
  GitBranch,
  Github,
  GitMerge,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Textarea } from './ui/textarea';
import { useState, useRef, useEffect } from 'react';
import { useSessionConversation } from '../hooks/useMessages';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SessionDetailProps {
  session: Session;
  onCreatePR: (sessionId: string) => void;
  onReply: (sessionId: string, message: string) => void;
}

export function SessionDetail({
  session,
  onCreatePR,
  onReply,
}: SessionDetailProps) {
  const [reply, setReply] = useState('');
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { conversation, isLoading } = useSessionConversation(session.id);

  const handleReply = () => {
    if (reply.trim()) {
      onReply(session.id, reply);
      setReply('');
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current && conversation && !isLoading) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [conversation, isLoading]);

  // Track scroll position to show/hide scroll buttons
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        scrollContainerRef.current;

      // Show scroll to top button when scrolled down more than 200px
      setShowScrollToTop(scrollTop > 200);

      // Show scroll to bottom button when not at the bottom (with 50px threshold)
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShowScrollToBottom(!isAtBottom && scrollHeight > clientHeight);
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="mb-2">{session.title}</h2>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Github className="w-4 h-4" />
                <a
                  href={`https://github.com/${session.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 hover:underline"
                >
                  {session.repo}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <GitBranch className="w-4 h-4" />
                  <a
                    href={`https://github.com/${session.repo}/tree/${session.branch}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 hover:underline"
                  >
                    {session.branch}
                  </a>
                </div>
                <GitMerge className="w-3 h-3" />
                <div className="flex items-center gap-1">
                  <GitBranch className="w-4 h-4" />
                  <a
                    href={`https://github.com/${session.repo}/tree/${session.targetBranch}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 hover:underline"
                  >
                    {session.targetBranch}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              session.inboxStatus === 'completed'
                ? 'bg-green-50 text-green-700 border-green-300'
                : session.inboxStatus === 'in-progress'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : session.inboxStatus === 'failed'
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-gray-50 text-gray-700 border-gray-300'
            }
          >
            {session.inboxStatus}
          </Badge>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-4 relative"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Loading conversation...</p>
          </div>
        ) : conversation && conversation.length > 0 ? (
          <div className="space-y-6">
            {conversation.map((item, itemIdx) => (
              <div key={`conversation-${itemIdx}`} className="space-y-4">
                {/* Render the prompt */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border-l-4 border-indigo-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-indigo-900">
                      Prompt
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        item.data.status === 'completed'
                          ? 'bg-green-50 text-green-700 border-green-300'
                          : item.data.status === 'processing'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : item.data.status === 'failed'
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : 'bg-gray-50 text-gray-700 border-gray-300'
                      }
                    >
                      {item.data.status}
                    </Badge>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-gray-800">
                    {item.data.content}
                  </p>
                </div>

                {/* Render messages for this prompt */}
                {item.messages.map((message) => (
                  <div
                    key={message.uuid}
                    className={`p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-gray-50'
                        : message.type === 'assistant'
                          ? 'bg-blue-50'
                          : message.type === 'system'
                            ? 'bg-purple-50'
                            : 'bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">
                        {message.type}
                      </span>
                    </div>
                    <div className="text-sm space-y-2">
                      {message.message?.content?.map((content, idx) => (
                        <div
                          key={content.id || `${message.uuid}-content-${idx}`}
                        >
                          {content.type === 'text' && content.text && (
                            <div className="markdown-content">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  code({ node, inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                      <SyntaxHighlighter
                                        style={oneDark}
                                        language={match[1]}
                                        PreTag="div"
                                        {...props}
                                      >
                                        {String(children).replace(/\n$/, '')}
                                      </SyntaxHighlighter>
                                    ) : (
                                      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
                                        {children}
                                      </code>
                                    );
                                  },
                                }}
                              >
                                {content.text}
                              </ReactMarkdown>
                            </div>
                          )}
                          {content.type === 'tool_use' && (
                            <div className="bg-white/50 p-2 rounded border border-gray-200">
                              <p className="text-xs text-gray-600 mb-1">
                                Tool: {content.name}
                              </p>
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(content.input, null, 2)}
                              </pre>
                            </div>
                          )}
                          {content.type === 'tool_result' && (
                            <div className="bg-white/50 p-2 rounded border border-gray-200">
                              <p className="text-xs text-gray-600 mb-1">
                                Tool Result
                              </p>
                              <pre className="text-xs overflow-x-auto">
                                {typeof content.content === 'string'
                                  ? content.content
                                  : JSON.stringify(content.content, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}

                      {message.message?.usage && (
                        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                          Tokens: {message.message.usage.input_tokens} in /{' '}
                          {message.message.usage.output_tokens} out
                          {message.message.usage.cache_read_input_tokens &&
                            ` / ${message.message.usage.cache_read_input_tokens} cached`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {session.inboxStatus === 'completed' && session.diffStats && (
              <div className="bg-white border rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium">Changes</h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-green-600">
                    +{session.diffStats.additions} additions
                  </span>
                  <span className="text-sm text-red-600">
                    -{session.diffStats.deletions} deletions
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No conversation yet</p>
          </div>
        )}

        {/* Scroll to top button */}
        {showScrollToTop && (
          <Button
            onClick={scrollToTop}
            className="fixed bottom-24 right-8 rounded-full w-12 h-12 p-0 shadow-lg"
            variant="default"
            size="icon"
            title="Scroll to top"
          >
            <ArrowUp className="w-5 h-5" />
          </Button>
        )}

        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <Button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-24 rounded-full w-12 h-12 p-0 shadow-lg"
            variant="default"
            size="icon"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="border-t p-4 space-y-3">
        {session.prUrl ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(session.prUrl, '_blank')}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View PR
          </Button>
        ) : session.inboxStatus === 'completed' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCreatePR(session.id)}
            className="w-full"
          >
            <Github className="w-4 h-4 mr-2" />
            Create PR
          </Button>
        ) : null}

        <div className="flex gap-2">
          <Textarea
            placeholder="Reply..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="flex-1 min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleReply();
              }
            }}
          />
          <Button onClick={handleReply} disabled={!reply.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
