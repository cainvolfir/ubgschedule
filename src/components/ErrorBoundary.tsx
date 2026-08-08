import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-4xl flex-col items-center justify-center px-4">
          <p className="font-body-semibold text-body-semibold mb-2 text-error dark:text-dark-error">Something went wrong</p>
          <p className="font-body-md text-body-md mb-4 text-secondary dark:text-on-tertiary-container">{this.state.error.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="font-body-semibold text-body-semibold rounded-full border border-outline px-xl py-md text-primary transition-colors hover:bg-surface-container-low dark:border-dark-border dark:text-dark-primary dark:hover:bg-surface-variant/10"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
