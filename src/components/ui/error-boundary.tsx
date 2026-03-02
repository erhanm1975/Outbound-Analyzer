import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 lg:p-12 text-center animate-in fade-in duration-500">
                    <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="bg-rose-500/10 border-b border-rose-500/20 p-6 flex flex-col items-center gap-4">
                            <div className="size-16 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                                <AlertTriangle className="w-8 h-8 text-rose-500" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-rose-400">System Malfunction</h1>
                                <p className="text-rose-400/80 text-sm mt-1">A critical error occurred in the React rendering cycle.</p>
                            </div>
                        </div>

                        {/* Error Details */}
                        <div className="p-6 bg-slate-900 text-left">
                            <div className="bg-black/50 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-auto max-h-[300px]">
                                <p className="text-rose-400 font-bold mb-2">Error: {this.state.error?.message}</p>
                                {this.state.errorInfo && (
                                    <pre className="text-slate-500 whitespace-pre-wrap leading-relaxed">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="mt-6 flex items-center justify-center gap-4">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Reload Application
                                </button>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('job_analyzer_config'); // Clear potentially bad config
                                        window.location.reload();
                                    }}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition-colors"
                                >
                                    <Home className="w-4 h-4" />
                                    Reset State
                                </button>
                            </div>
                        </div>
                        <div className="bg-slate-950 p-4 text-xs text-slate-500 font-mono text-center border-t border-slate-800">
                            Outbound Performance Analyzer • V.3.0.0
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
