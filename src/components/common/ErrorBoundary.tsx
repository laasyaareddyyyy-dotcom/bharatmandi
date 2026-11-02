import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#d4af37] flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-[#1a3a52]">
                Something went wrong
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                The application encountered an unexpected error. Your recorded data remains safely stored.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left font-mono text-[11px] text-slate-700 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1a3a52] text-white text-xs font-bold hover:bg-[#122839] transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-4 h-4 text-[#d4af37]" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
