import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component to catch and handle React rendering errors gracefully.
 * This prevents the entire app from crashing when there are issues with message data.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI or use the provided one
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-red-900">
                  Something went wrong
                </h3>
                <p className="text-sm text-red-800">
                  There was an error displaying the conversation. This may be due
                  to corrupted message data.
                </p>
                {this.state.error && (
                  <details className="text-xs text-red-700 mt-2">
                    <summary className="cursor-pointer font-medium">
                      Error details
                    </summary>
                    <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto max-h-40">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="default"
                size="sm"
                className="w-full"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
