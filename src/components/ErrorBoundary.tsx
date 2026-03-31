import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): any {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    const state = (this as any).state;
    if (state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      let isFirestoreError = false;

      try {
        if (state.error?.message) {
          const parsed = JSON.parse(state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firestore Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path || 'unknown path'}`;
            isFirestoreError = true;
          }
        }
      } catch (e) {
        errorMessage = state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-purple-100 border border-gray-100 text-center space-y-6">
            <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900">Something went wrong</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {isFirestoreError ? 'There was a problem communicating with the database.' : 'The application encountered an error.'}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-2xl text-left">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Error Details</p>
              <p className="text-xs font-mono text-gray-600 break-all">{errorMessage}</p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center justify-center"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
