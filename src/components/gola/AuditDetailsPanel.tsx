import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, XCircle, Terminal, ListOrdered, FileText, Upload } from 'lucide-react';
import type { AuditMission, AuditLogType, AuditLog } from '../../types/gola';

interface AuditDetailsPanelProps {
    mission: AuditMission | null;
    onClose: () => void;
}

export function AuditDetailsPanel({ mission, onClose }: AuditDetailsPanelProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'steps' | 'logs'>('overview');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Reset tab to overview when mission changes
    useEffect(() => {
        if (mission) {
            setActiveTab('overview');
        }
    }, [mission?.id]);

    // Auto-scroll logs
    useEffect(() => {
        if (activeTab === 'logs' && mission?.logs && scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [mission?.logs, activeTab]);

    const getLogColor = (type: AuditLogType) => {
        switch (type) {
            case 'INFO': return 'text-slate-500';
            case 'ACTION': return 'text-blue-400';
            case 'ASSERT_PASS': return 'text-emerald-400';
            case 'ASSERT_FAIL': return 'text-rose-500 font-bold';
            case 'ERROR': return 'text-rose-500 bg-rose-950/20';
            case 'DB': return 'text-amber-400 font-mono';
            case 'CALC': return 'text-cyan-400 font-mono';
            case 'EXECUTE': return 'text-violet-400 font-bold';
            case 'DATA': return 'text-cyan-400 font-mono';
            case 'DEBUG': return 'text-slate-600 font-mono text-[10px]';
            case 'PASS': return 'text-emerald-500 font-bold bg-emerald-950/20 px-1 rounded';
            case 'FAIL': return 'text-rose-500 font-bold bg-rose-950/20 px-1 rounded';
            default: return 'text-slate-500';
        }
    };

    if (!mission) {
        return (
            <div className="hidden lg:flex flex-col items-center justify-center h-full bg-slate-900 rounded-xl border border-slate-800 p-4 text-slate-500 gap-4">
                <FileText className="w-12 h-12 opacity-20" />
                <p className="text-sm">Select an audit to view details</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#0b111a] p-4 flex flex-col gap-4 lg:static lg:bg-slate-900 lg:rounded-xl lg:border lg:border-slate-800 lg:h-full transition-all duration-300">
            <div className="flex justify-between items-center shrink-0">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    Audit Details
                </h3>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                    <X size={18} />
                </button>
            </div>

            <div className="flex justify-between items-start shrink-0 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <div>
                    <h4 className="text-white font-bold text-sm leading-tight">{mission.name}</h4>
                    <span className="font-mono text-[10px] text-blue-400">{mission.id}</span>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider
                        ${mission.status === 'SUCCESS' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                            mission.status === 'FAILURE' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                                'text-slate-400 border-slate-600 bg-slate-800'
                        }`}>
                        {mission.status}
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg shrink-0">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'overview' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                >
                    <FileText size={14} />
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('steps')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'steps' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                >
                    <ListOrdered size={14} />
                    Steps
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'logs' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                >
                    <Terminal size={14} />
                    Logs
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                {activeTab === 'overview' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">Description</h5>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {mission.description}
                            </p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">Detailed Explanation</h5>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {mission.explanation}
                            </p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">Verification Logic</h5>
                            <div className="text-[11px] font-mono whitespace-pre-line text-emerald-400 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed">
                                {mission.logic}
                            </div>
                        </div>

                        {mission.expectedResults && (
                            <div className="flex flex-col gap-1.5">
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1">Expected Results</h5>
                                <div className="text-[11px] font-mono text-blue-300 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed">
                                    <pre>{JSON.stringify(mission.expectedResults, null, 2)}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'steps' && (
                    <div className="flex flex-col gap-1 py-2">
                        {(mission.steps || []).length > 0 ? (
                            <div className="relative border-l border-slate-800 ml-3 space-y-4">
                                {mission.steps?.map((step, i) => (
                                    <div key={i} className="relative pl-6">
                                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-slate-600"></div>
                                        <div className="flex items-start gap-2">
                                            <span className="font-mono text-[10px] font-bold text-slate-500 shrink-0 bg-slate-800 px-1.5 rounded">{(i + 1).toString().padStart(2, '0')}</span>
                                            <p className="text-xs text-slate-300 pt-0.5">{step}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-32 text-slate-500 italic gap-2 opacity-60">
                                <ListOrdered size={24} />
                                <span className="text-xs">No explicit steps defined for this audit.</span>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="flex flex-col gap-1 h-full bg-slate-950 rounded-lg border border-slate-800 p-2 overflow-y-auto">
                        {(mission.logs || []).map((log) => (
                            <div key={log.id} className="flex items-start gap-2 text-xs p-1 hover:bg-white/5 rounded transition-colors">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0
                                    ${log.type === 'ASSERT_PASS' || log.type === 'PASS' ? 'bg-green-500' :
                                        log.type === 'ASSERT_FAIL' || log.type === 'FAIL' || log.type === 'ERROR' ? 'bg-red-500' :
                                            log.type === 'ACTION' ? 'bg-blue-500' :
                                                log.type === 'DATA' ? 'bg-cyan-500' :
                                                    log.type === 'DEBUG' ? 'bg-slate-700' : 'bg-slate-500'}`}></div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className={`font-mono text-[11px] break-words ${getLogColor(log.type)}`}>{log.message}</span>
                                    <span className="text-slate-600 text-[9px] font-mono">{log.timestamp}</span>
                                </div>
                            </div>
                        ))}

                        {(!mission.logs || mission.logs.length === 0) && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 italic gap-2 opacity-60">
                                <Terminal size={24} />
                                <span className="text-xs">No logs available. Run the audit to see telemetry.</span>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                )}
            </div>
        </div>
    );
}
