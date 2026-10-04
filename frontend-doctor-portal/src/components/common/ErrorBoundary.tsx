import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertOctagon } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Doctor Portal UI Boundary Exception:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.href = '/';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white rounded-xl p-8 shadow-lg border border-slate-300 text-center">
            <div className="inline-flex p-3 bg-rose-100 rounded-full text-rose-700 mb-4">
              <AlertOctagon className="w-10 h-10" />
            </div>

            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Clinical Review Portal Interface Error
            </h1>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              An unexpected interface rendering issue occurred. No patient data or doctor edits have been altered on the server.
            </p>

            <div className="flex justify-center">
              <Button
                variant="primary"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Reload Doctor Portal
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
