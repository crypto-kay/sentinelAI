import React from 'react';
import { ShieldAlert, Activity, Settings } from 'lucide-react';

interface HeaderProps {
  isMonitoring: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isMonitoring, onOpenSettings }) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${isMonitoring ? 'bg-red-900/20 text-red-500 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
          <ShieldAlert size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Sentinel-AI</h1>
          <p className="text-xs text-slate-400 font-mono tracking-wider">CROSS-PLATFORM SURVEILLANCE V1.0</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-slate-500">
          <Activity size={14} />
          <span>SYSTEM STATUS: {isMonitoring ? 'ACTIVE' : 'STANDBY'}</span>
        </div>
        <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
        
        {/* Mobile Settings Toggle */}
        <button 
          onClick={onOpenSettings}
          className="lg:hidden p-2 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          aria-label="Open Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};