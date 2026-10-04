import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, PhoneCall, HeartHandshake } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // PHI-safe client logging
    console.error('Kiosk UI Boundary caught an error:', error.message, errorInfo.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 select-none">
          <div className="max-w-2xl w-full bg-white rounded-3xl p-8 md:p-12 shadow-xl border-2 border-slate-200 text-center">
            <div className="inline-flex p-4 bg-sky-100 rounded-full text-sky-700 mb-6">
              <HeartHandshake className="w-16 h-16" />
            </div>

            <h1 className="text-kiosk-2xl font-bold text-slate-900 mb-4">
              Please Don't Worry — We Are Here to Help
            </h1>

            <p className="text-kiosk-base text-slate-600 mb-8 leading-relaxed">
              The intake screen encountered a temporary pause. None of your medical records have been lost. You can restart the kiosk, or a hospital staff member can assist you immediately.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                variant="kiosk-action"
                size="kiosk-touch"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-6 h-6" />}
              >
                Restart Kiosk Screen
              </Button>
            </div>

            <div className="bg-amber-50 rounded-2xl p-5 border-2 border-amber-200 flex items-center justify-center gap-3 text-amber-900">
              <PhoneCall className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <span className="text-kiosk-base font-medium">
                Hospital OPD Staff Attendant Desk: <strong>Counter #1</strong>
              </span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
