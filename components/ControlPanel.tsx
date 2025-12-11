import React, { useState } from 'react';
import { AppConfig, AuthorizedPerson } from '../types';
import { Settings, X, Users, UserPlus, Trash2, Fingerprint, Activity, UploadCloud, Zap, Battery, BatteryCharging, BatteryLow } from 'lucide-react';

interface ControlPanelProps {
  config: AppConfig;
  onConfigChange: (newConfig: AppConfig) => void;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  isOpen: boolean;
  onClose: () => void;
  authorizedPeople: AuthorizedPerson[];
  onRemovePerson: (id: string) => void;
  onOpenEnrollment: () => void; // Generic opener, modal handles tabs
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  config, 
  onConfigChange, 
  isMonitoring, 
  onToggleMonitoring,
  isOpen,
  onClose,
  authorizedPeople,
  onRemovePerson,
  onOpenEnrollment
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'people'>('config');

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     onConfigChange({ ...config, [e.target.name]: parseFloat(e.target.value) });
  };

  const handleModeChange = (mode: 'HIGH' | 'BALANCED' | 'LOW_POWER') => {
      let interval = 500;
      if (mode === 'HIGH') interval = 200;
      if (mode === 'LOW_POWER') interval = 1000;
      
      onConfigChange({ ...config, performanceMode: mode, analysisIntervalMs: interval });
  };

  return (
    <>
      {/* Universal Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Main Panel - Slide-over Drawer for ALL screens */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-950 border-l border-slate-800 flex flex-col h-full shadow-2xl transition-transform duration-300 ease-in-out transform
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex space-x-4">
             <button 
                onClick={() => setActiveTab('config')}
                className={`flex items-center space-x-2 pb-1 border-b-2 transition-colors ${activeTab === 'config' ? 'border-sentinel-accent text-sentinel-accent' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
             >
               <Settings size={18} />
               <span className="font-bold text-sm">SYSTEM</span>
             </button>
             <button 
                onClick={() => setActiveTab('people')}
                className={`flex items-center space-x-2 pb-1 border-b-2 transition-colors ${activeTab === 'people' ? 'border-sentinel-accent text-sentinel-accent' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
             >
               <Users size={18} />
               <span className="font-bold text-sm">PERSONNEL</span>
             </button>
          </div>
          
          {/* Close Button - Always Visible */}
          <button 
            onClick={onClose}
            className="p-2 bg-slate-900 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors border border-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
          
          {activeTab === 'config' && (
            <div className="space-y-8 animate-in fade-in">
              
              <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                <div className="flex items-start gap-3">
                   <Activity className="text-sentinel-accent shrink-0 mt-1" size={20} />
                   <div>
                      <h4 className="text-sm font-bold text-white mb-1">Global Configuration</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        These settings apply to all active camera feeds. Adjust performance based on your local device capabilities.
                      </p>
                   </div>
                </div>
              </div>

              {/* Performance Mode */}
              <div className="space-y-3">
                 <label className="text-xs font-mono text-slate-400 uppercase flex items-center gap-2">
                    <Zap size={14} /> Performance Profile
                 </label>
                 <div className="grid grid-cols-3 gap-2">
                    <button 
                        onClick={() => handleModeChange('HIGH')}
                        className={`p-2 rounded border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                            config.performanceMode === 'HIGH' 
                            ? 'bg-red-900/20 border-red-500 text-red-400' 
                            : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                        }`}
                    >
                        <BatteryCharging size={16} />
                        HIGH
                    </button>
                    <button 
                        onClick={() => handleModeChange('BALANCED')}
                        className={`p-2 rounded border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                            config.performanceMode === 'BALANCED' 
                            ? 'bg-blue-900/20 border-blue-500 text-blue-400' 
                            : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                        }`}
                    >
                        <Battery size={16} />
                        BALANCED
                    </button>
                    <button 
                        onClick={() => handleModeChange('LOW_POWER')}
                        className={`p-2 rounded border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                            config.performanceMode === 'LOW_POWER' 
                            ? 'bg-green-900/20 border-green-500 text-green-400' 
                            : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'
                        }`}
                    >
                        <BatteryLow size={16} />
                        ECO
                    </button>
                 </div>
                 <p className="text-[10px] text-slate-500">
                    {config.performanceMode === 'HIGH' && "Max FPS & Analysis. High CPU/GPU usage. Recommended for Desktops."}
                    {config.performanceMode === 'BALANCED' && "Standard surveillance interval (500ms). Good for Laptops."}
                    {config.performanceMode === 'LOW_POWER' && "Slower analysis (1s). Recommended for Tablets/Phones to prevent overheating."}
                 </p>
              </div>

              <div className="h-px bg-slate-800" />

              {/* Thresholds */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-xs font-mono text-slate-400 uppercase flex items-center gap-2">
                      <Fingerprint size={14}/> Face Match Strictness
                    </label>
                    <span className="text-xs text-sentinel-accent font-mono">{config.faceMatchThreshold}</span>
                  </div>
                  <input
                    type="range"
                    name="faceMatchThreshold"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={config.faceMatchThreshold}
                    onChange={handleSliderChange}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sentinel-accent"
                  />
                  <p className="text-[10px] text-slate-500">Higher values reduce false positives but may miss known faces in poor lighting.</p>
                </div>

                 <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-xs font-mono text-slate-400 uppercase">Object Confidence</label>
                    <span className="text-xs text-sentinel-accent font-mono">{(config.minConfidence * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    name="minConfidence"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    value={config.minConfidence}
                    onChange={handleSliderChange}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sentinel-accent"
                  />
                   <p className="text-[10px] text-slate-500">Minimum confidence score required for the AI to flag an object.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'people' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white">Database Management</h3>
                <p className="text-xs text-slate-400">
                  Manage authorized personnel. Use single entry for detailed input or bulk import for mass enrollment.
                </p>
                
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                        onClick={onOpenEnrollment}
                        disabled={isMonitoring}
                        className="py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
                    >
                        <UserPlus size={16} className="text-sentinel-accent" />
                        <span>SINGLE ENROLL</span>
                    </button>
                    <button
                        onClick={onOpenEnrollment}
                        disabled={isMonitoring}
                        className="py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
                    >
                        <UploadCloud size={16} className="text-sentinel-accent" />
                        <span>BULK IMPORT</span>
                    </button>
                </div>
                {isMonitoring && (
                    <p className="text-[10px] text-red-400 text-center">Stop surveillance to modify database.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Authorized Personnel ({authorizedPeople.length})</label>
                {authorizedPeople.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-lg">
                    <p className="text-slate-600 text-sm">Database Empty</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {authorizedPeople.map(person => (
                      <div key={person.id} className="flex items-center justify-between bg-slate-900 p-3 rounded border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700 shrink-0">
                            {person.name.charAt(0)}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{person.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase">{person.role}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => onRemovePerson(person.id)}
                          className="text-slate-600 hover:text-red-500 transition-colors p-2 shrink-0"
                          title="Remove Person"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Action */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={onToggleMonitoring}
            className={`w-full py-4 rounded font-bold tracking-wider text-sm transition-all shadow-lg flex items-center justify-center space-x-2 ${
              isMonitoring
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20'
            }`}
          >
            {isMonitoring ? (
               <><span>TERMINATE SURVEILLANCE</span></>
            ) : (
               <><span>ACTIVATE SURVEILLANCE</span></>
            )}
          </button>
        </div>
      </div>
    </>
  );
};