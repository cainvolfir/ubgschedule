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
          <p className="pixel-font mb-2 text-[10px] text-red-600">Something went wrong</p>
          <p className="pixel-font mb-4 text-[8px] text-zinc-400">{this.state.error.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="pixel-font rounded border border-black px-4 py-1.5 text-[9px] hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
