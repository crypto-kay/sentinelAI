import React, { useState } from 'react';
import { AppConfig, AuthorizedPerson } from '../types';
import { Settings, Camera, Globe, Sliders, X, Users, UserPlus, Trash2, Fingerprint } from 'lucide-react';

interface ControlPanelProps {
  config: AppConfig;
  onConfigChange: (newConfig: AppConfig) => void;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  isOpen: boolean;
  onClose: () => void;
  authorizedPeople: AuthorizedPerson[];
  onRemovePerson: (id: string) => void;
  onEnrollMode: () => void;
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
  onEnrollMode
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'people'>('config');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, [e.target.name]: e.target.value });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     onConfigChange({ ...config, [e.target.name]: parseFloat(e.target.value) });
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
              {/* Source Selection */}
              <div className="space-y-3">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Video Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onConfigChange({ ...config, cameraSource: 'webcam' })}
                    className={`flex items-center justify-center space-x-2 p-3 rounded border transition-all ${
                      config.cameraSource === 'webcam' 
                        ? 'bg-sentinel-accent/10 border-sentinel-accent text-sentinel-accent' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Camera size={16} />
                    <span className="text-sm font-medium">Webcam</span>
                  </button>
                  <button
                    onClick={() => onConfigChange({ ...config, cameraSource: 'ip_camera' })}
                    className={`flex items-center justify-center space-x-2 p-3 rounded border transition-all ${
                      config.cameraSource === 'ip_camera' 
                        ? 'bg-sentinel-accent/10 border-sentinel-accent text-sentinel-accent' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Globe size={16} />
                    <span className="text-sm font-medium">IP Cam</span>
                  </button>
                </div>
              </div>

              {/* IP Camera Settings */}
              {config.cameraSource === 'ip_camera' && (
                <div className="space-y-2 p-4 bg-slate-900 rounded border border-slate-800">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Stream URL</label>
                  <input
                    type="text"
                    name="ipCameraUrl"
                    value={config.ipCameraUrl}
                    onChange={handleInputChange}
                    placeholder="http://192.168.1.X:8080/video"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sentinel-accent placeholder-slate-700 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    * Supports MJPEG streams (e.g., Android IP Webcam). Ensure the device and laptop are on the same Wi-Fi.
                  </p>
                </div>
              )}

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
                </div>

                 <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-xs font-mono text-slate-400 uppercase">Detection Confidence</label>
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
                </div>
              </div>
            </div>
          )}

          {activeTab === 'people' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2">Vector Database</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Enroll faces to authorize entry. Unauthorized faces trigger alerts.
                </p>
                <button
                  onClick={onEnrollMode}
                  disabled={isMonitoring}
                  className="w-full py-2 bg-sentinel-accent hover:bg-blue-600 text-white rounded text-sm font-bold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus size={16} />
                  <span>ENROLL NEW FACE</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">Authorized Personnel ({authorizedPeople.length})</label>
                {authorizedPeople.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-lg">
                    <p className="text-slate-600 text-sm">Database Empty</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {authorizedPeople.map(person => (
                      <div key={person.id} className="flex items-center justify-between bg-slate-900 p-3 rounded border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700">
                            {person.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{person.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase">{person.role}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => onRemovePerson(person.id)}
                          className="text-slate-600 hover:text-red-500 transition-colors p-2"
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