import React from 'react';
import { DetectionLog } from '../types';
import { AlertOctagon, AlertTriangle, CheckCircle, Search, Filter, ChevronDown } from 'lucide-react';

interface LogPanelProps {
  logs: DetectionLog[];
  onClose?: () => void;
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs, onClose }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* Toolbar */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
             <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-6 bg-sentinel-accent rounded-sm"></span>
                Security Event Log
             </h3>
             <span className="text-xs text-slate-500 font-mono hidden sm:inline">Real-time Data Stream</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
                <Search size={14} className="absolute left-2 top-1.5 text-slate-500"/>
                <input 
                    type="text" 
                    placeholder="Search logs..." 
                    className="bg-slate-900 border border-slate-700 rounded pl-8 pr-3 py-1 text-xs text-white focus:outline-none focus:border-sentinel-accent w-48 font-mono"
                />
            </div>
            {onClose && (
                <button 
                    onClick={onClose}
                    className="p-1.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded border border-slate-700 ml-2"
                    title="Minimize Logs"
                >
                    <ChevronDown size={14} />
                </button>
            )}
        </div>
      </div>
      
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono shrink-0">
        <div className="col-span-3 sm:col-span-2">Timestamp</div>
        <div className="col-span-3 sm:col-span-2">Camera ID</div>
        <div className="col-span-2 hidden sm:block">Severity</div>
        <div className="col-span-6 sm:col-span-4">Event Description</div>
        <div className="col-span-2 text-right hidden sm:block">Confidence</div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 py-8">
            <CheckCircle size={24} className="mb-2 opacity-50"/>
            <p className="text-xs font-mono">NO SECURITY EVENTS RECORDED</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {logs.slice().reverse().map((log) => (
              <div 
                key={log.id} 
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-800/50 transition-colors text-xs border-l-2 ${
                    log.threatLevel === 'CRITICAL' ? 'border-l-red-500 bg-red-950/10' :
                    log.threatLevel === 'WARNING' ? 'border-l-yellow-500 bg-yellow-950/10' :
                    log.threatLevel === 'UNAUTHORIZED' ? 'border-l-orange-500' :
                    'border-l-green-500'
                }`}
              >
                <div className="col-span-3 sm:col-span-2 font-mono text-slate-400 truncate">{log.timestamp}</div>
                
                <div className="col-span-3 sm:col-span-2">
                    <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono border border-slate-700 truncate block w-fit max-w-full">
                        {log.cameraName}
                    </span>
                </div>
                
                <div className="col-span-2 hidden sm:block">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        log.threatLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        log.threatLevel === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        log.threatLevel === 'UNAUTHORIZED' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                        {log.threatLevel === 'CRITICAL' && <AlertOctagon size={10} />}
                        {log.threatLevel === 'WARNING' && <AlertTriangle size={10} />}
                        {log.threatLevel}
                    </span>
                </div>
                
                <div className="col-span-6 sm:col-span-4 text-slate-300 font-medium truncate" title={log.description}>
                    {log.description}
                </div>
                
                <div className="col-span-2 text-right hidden sm:block">
                    {log.details && log.details.length > 0 && (
                        <span className="font-mono text-slate-500">
                            {(log.details[0].confidence * 100).toFixed(0)}%
                        </span>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};