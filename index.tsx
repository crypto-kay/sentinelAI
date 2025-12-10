import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Define explicit interfaces to satisfy strict TypeScript checks
interface ErrorBoundaryProps {
  children?: React.ReactNode; // Optional to prevent strict JSX "missing property" errors
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declare state and props to satisfy strict compiler
  public state: ErrorBoundaryState = { hasError: false, error: null };
  public props: ErrorBoundaryProps; 

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white p-8 font-mono">
          <h1 className="text-2xl font-bold text-red-500 mb-4">System Critical Error</h1>
          <p className="mb-4">The surveillance dashboard encountered a runtime error.</p>
          <div className="bg-slate-900 p-4 rounded border border-red-900/50 overflow-auto">
            <p className="font-bold text-red-400 mb-2">{this.state.error?.toString()}</p>
            <pre className="text-xs text-slate-400 whitespace-pre-wrap">
              {this.state.error?.stack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors"
          >
            Reboot System
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);