import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Linkify from 'linkify-react';
import { ToolCallDisplay } from './ToolCallDisplay';
import { AssistantMessage } from '@/utils/conversationTransform';

interface MessageContentProps {
  message: AssistantMessage;
}

export function MessageContent({ message }: MessageContentProps) {
  return (
    <div
      className={`p-3 rounded-lg ${
        message.role === 'user'
          ? 'bg-gray-50'
          : message.role === 'assistant'
            ? 'bg-blue-50'
            : 'bg-purple-50'
      }`}
    >
      <div className="text-sm space-y-2">
        {message.content.map((content, idx) => {
          if (content.type === 'text') {
            return (
              <div
                key={`${message.id}-text-${idx}`}
                className="markdown-content prose prose-sm max-w-none break-words"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            maxWidth: '100%',
                            overflowX: 'auto',
                            wordBreak: 'break-word',
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code
                          className="bg-gray-100 px-1 py-0.5 rounded text-sm"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    p({ children }) {
                      return (
                        <p>
                          <Linkify
                            options={{
                              target: '_blank',
                              rel: 'noopener noreferrer',
                              className:
                                'text-blue-600 hover:text-blue-800 underline',
                            }}
                          >
                            {children}
                          </Linkify>
                        </p>
                      );
                    },
                    text({ children }) {
                      return (
                        <Linkify
                          options={{
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            className:
                              'text-blue-600 hover:text-blue-800 underline',
                          }}
                        >
                          {children}
                        </Linkify>
                      );
                    },
                  }}
                >
                  {content.text || ''}
                </ReactMarkdown>
              </div>
            );
          }

          if (content.type === 'tool-call') {
            return (
              <ToolCallDisplay
                key={`${message.id}-tool-${idx}`}
                toolName={content.toolName || ''}
                args={content.args}
              />
            );
          }

          if (content.type === 'tool-result') {
            return (
              <div
                key={`${message.id}-result-${idx}`}
                className="bg-white/50 p-2 rounded border border-gray-200"
              >
                <p className="text-xs text-gray-600 mb-1">Tool Result</p>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                  {typeof content.result === 'string'
                    ? content.result
                    : JSON.stringify(content.result, null, 2)}
                </pre>
              </div>
            );
          }

          return null;
        })}

        {message.metadata?.usage && (
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
            Tokens: {message.metadata.usage.input_tokens} in /{' '}
            {message.metadata.usage.output_tokens} out
            {message.metadata.usage.cache_read_input_tokens &&
              ` / ${message.metadata.usage.cache_read_input_tokens} cached`}
          </div>
        )}
      </div>
    </div>
  );
}
