import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { VideoFeed } from './components/VideoFeed';
import { LogPanel } from './components/LogPanel';
import { EnrollmentModal } from './components/EnrollmentModal';
import { AppConfig, DetectionLog, FrameAnalysisResult, AuthorizedPerson, CameraDef } from './types';
import { surveillanceService } from './services/surveillanceService';
import { Plus, LayoutGrid, PanelBottom, PanelBottomClose, CloudLightning, Camera, X } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Add Camera Modal Component (Revised for IP Camera Focus) ---
interface AddFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: 'webcam' | 'cloud_stream', url?: string, name?: string) => void;
}

const AddFeedModal: React.FC<AddFeedModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [activeType, setActiveType] = useState<'cloud_stream' | 'webcam'>('cloud_stream');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(activeType, url, name);
    // Reset fields
    setUrl('');
    setName('');
    setActiveType('cloud_stream');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Plus size={18} className="text-sentinel-accent" />
            ADD SURVEILLANCE FEED
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Type Selector - Reordered to prioritize Cloud/IP Stream */}
          <div className="grid grid-cols-2 gap-3">
             <button
              type="button"
              onClick={() => setActiveType('cloud_stream')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                activeType === 'cloud_stream' 
                  ? 'bg-sentinel-accent/10 border-sentinel-accent text-sentinel-accent' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              <CloudLightning size={24} className="mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider">IP Camera Stream</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveType('webcam')}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                activeType === 'webcam' 
                  ? 'bg-sentinel-accent/10 border-sentinel-accent text-sentinel-accent' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Camera size={24} className="mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider">Local Test Cam</span>
            </button>
          </div>

          {/* Dynamic Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
               <label className="text-xs font-mono text-slate-400 uppercase">Camera Name (Optional)</label>
               <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={activeType === 'webcam' ? "e.g., Test Device 1" : "e.g., Main Gate Feed"}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-sentinel-accent focus:outline-none"
               />
            </div>

            {activeType === 'cloud_stream' && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2">
                 <label className="text-xs font-mono text-slate-400 uppercase">Stream URL <span className="text-red-500">*</span></label>
                 <input 
                    type="url" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    placeholder="http://192.168.1.x/stream.m3u8"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-sentinel-accent focus:outline-none font-mono"
                 />
                 <p className="text-[10px] text-slate-500 leading-tight">
                   Enter HTTP/HTTPS URL. Supports HLS (.m3u8), MP4/WebM, and MJPEG (.mjpg).
                   <br/>For RTSP, ensure you are using a transcoding proxy or use MJPEG if available.
                 </p>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button 
            type="submit"
            className="w-full py-3 bg-sentinel-accent hover:bg-blue-600 text-white font-bold rounded flex items-center justify-center gap-2 transition-all shadow-lg shadow-sentinel-accent/20"
          >
            <Plus size={16} />
            CONFIRM & ADD FEED
          </button>
        </form>

      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showLogs, setShowLogs] = useState(true);
  const [logs, setLogs] = useState<DetectionLog[]>([]);
  
  // Multi-Camera State
  const [cameras, setCameras] = useState<CameraDef[]>([
    { id: 'cam-01', name: 'IP-CAM-01 (Demo)', type: 'cloud_stream', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', status: 'ACTIVE' }
  ]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);

  const [authorizedPeople, setAuthorizedPeople] = useState<AuthorizedPerson[]>([]);
  
  // Initialize with BALANCED mode for good default performance
  const [config, setConfig] = useState<AppConfig>({
    minConfidence: 0.5,
    faceMatchThreshold: 0.6,
    analysisIntervalMs: 500,
    performanceMode: 'BALANCED'
  });

  const [alertActive, setAlertActive] = useState(false);

  // Load Persisted Data
  useEffect(() => {
    const savedPeople = localStorage.getItem('sentinel_personnel');
    if (savedPeople) {
      const parsed = JSON.parse(savedPeople);
      setAuthorizedPeople(parsed);
      surveillanceService.updateFaceDatabase(parsed);
    }
  }, []);

  // Audio Alert Logic
  useEffect(() => {
    if (alertActive) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);

      const timeout = setTimeout(() => setAlertActive(false), 2000); 
      return () => {
        clearTimeout(timeout);
        oscillator.stop();
        audioCtx.close();
      };
    }
  }, [alertActive]);

  const handleAnalysisResult = useCallback((cameraId: string, result: FrameAnalysisResult) => {
    const hasLoggableEvent = result.threatLevel !== 'SAFE' || result.objects.length > 0 || result.identities.length > 0;
    
    if (hasLoggableEvent) {
      const cameraName = cameras.find(c => c.id === cameraId)?.name || cameraId;
      
      const desc = result.threatLevel === 'UNAUTHORIZED' 
         ? `Intruder detected` 
         : `Detected: ${[...result.identities, ...result.objects].join(', ')}`;

      // Throttle logs
      setLogs(prev => {
        if (prev.length > 0) {
           const last = prev[prev.length - 1];
           // Only skip if same cam, same threat, same description
           if (last.cameraId === cameraId && last.description === desc && last.threatLevel === result.threatLevel) {
             return prev;
           }
        }

        const newLog: DetectionLog = {
          id: generateId(),
          cameraId,
          cameraName,
          timestamp: new Date().toLocaleTimeString(),
          threatLevel: result.threatLevel,
          detectedObjects: [...result.objects, ...result.identities],
          description: desc,
          details: result.details
        };

        return [...prev, newLog].slice(-100); // Keep last 100
      });

      if (result.threatLevel === 'CRITICAL' || result.threatLevel === 'UNAUTHORIZED') {
        setAlertActive(true);
      }
    }
  }, [cameras]);

  const addCamera = (type: 'webcam' | 'cloud_stream', url?: string, name?: string) => {
    const newId = generateId();
    const count = cameras.length + 1;
    const defaultName = type === 'webcam' ? `LOCAL-CAM-${count}` : `IP-CAM-${count}`;
    
    const newCam: CameraDef = {
      id: newId,
      name: name || defaultName,
      type: type,
      url: type === 'cloud_stream' ? url : undefined,
      status: 'ACTIVE'
    };

    setCameras(prev => [...prev, newCam]);
    setIsAddModalOpen(false);
  };

  const removeCamera = (id: string) => {
      setCameras(cameras.filter(c => c.id !== id));
  };

  const handleRemovePerson = (id: string) => {
     const updated = authorizedPeople.filter(p => p.id !== id);
     setAuthorizedPeople(updated);
     localStorage.setItem('sentinel_personnel', JSON.stringify(updated));
     surveillanceService.updateFaceDatabase(updated);
  };

  const handleEnrollPerson = (name: string, role: string, descriptors: number[][]) => {
      const newPerson: AuthorizedPerson = {
          id: generateId(),
          name,
          role,
          descriptors,
          createdAt: Date.now()
      };
      
      const updated = [...authorizedPeople, newPerson];
      setAuthorizedPeople(updated);
      localStorage.setItem('sentinel_personnel', JSON.stringify(updated));
      surveillanceService.updateFaceDatabase(updated);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <Header 
        isMonitoring={isMonitoring} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
      />
      
      <main className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden relative">
          
          {/* Admin Command Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-wrap gap-2 justify-between items-center shrink-0 shadow-sm">
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 text-slate-400">
                     <LayoutGrid size={18} />
                     <span className="hidden sm:inline text-sm font-bold tracking-wide">COMMAND CENTER</span>
                 </div>
                 <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
                 <span className="text-xs text-slate-500 font-mono whitespace-nowrap">{cameras.length} FEEDS ACTIVE</span>
             </div>

             <div className="flex items-center gap-2">
                 {/* Log Toggle */}
                 <button 
                    onClick={() => setShowLogs(!showLogs)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors border ${
                        showLogs 
                        ? 'bg-slate-800 text-white border-slate-600' 
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                    title={showLogs ? "Hide Logs" : "Show Logs"}
                 >
                    {showLogs ? <PanelBottomClose size={14} /> : <PanelBottom size={14} />}
                    <span className="hidden sm:inline">{showLogs ? 'HIDE LOGS' : 'SHOW LOGS'}</span>
                 </button>

                 <div className="h-4 w-px bg-slate-700 mx-2"></div>

                 <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-sentinel-accent hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg shadow-blue-900/20 whitespace-nowrap"
                 >
                    <Plus size={14} />
                    ADD FEED
                 </button>
             </div>
          </div>

          {/* Camera Grid - Dynamic Layout */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
              <div className={`grid gap-4 h-full ${
                  cameras.length === 1 ? 'grid-cols-1' : 
                  cameras.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
                  {cameras.map((cam) => (
                      <div key={cam.id} className="min-h-[250px] relative">
                          <VideoFeed 
                            camera={cam}
                            config={config}
                            isMonitoring={isMonitoring}
                            onAnalysisResult={handleAnalysisResult}
                            onDelete={cameras.length > 1 ? () => removeCamera(cam.id) : undefined}
                          />
                      </div>
                  ))}
                  
                  {/* Empty Slot Placeholder */}
                  {cameras.length < 6 && (
                      <div 
                        onClick={() => setIsAddModalOpen(true)}
                        className="min-h-[250px] bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600 hover:border-slate-600 hover:text-slate-400 cursor-pointer transition-all group"
                      >
                          <CloudLightning size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-mono font-bold">ADD FEED</span>
                      </div>
                  )}
              </div>
          </div>

          {/* Bottom Logs (Collapsible) */}
          {showLogs && (
              <div className="h-64 shrink-0 animate-in slide-in-from-bottom-4 duration-300">
                 <LogPanel logs={logs} onClose={() => setShowLogs(false)} />
              </div>
          )}
      </main>

      {/* Modals & Overlays */}
      <ControlPanel 
        config={config} 
        onConfigChange={(newConfig) => setConfig(prev => ({...prev, ...newConfig}))} 
        isMonitoring={isMonitoring}
        onToggleMonitoring={() => setIsMonitoring(!isMonitoring)}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        authorizedPeople={authorizedPeople}
        onRemovePerson={handleRemovePerson}
        onOpenEnrollment={() => setIsEnrollmentOpen(true)}
      />

      <AddFeedModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={addCamera} 
      />
      
      <EnrollmentModal 
        isOpen={isEnrollmentOpen}
        onClose={() => setIsEnrollmentOpen(false)}
        onEnroll={handleEnrollPerson}
      />
      
      {/* Global Alert Overlay */}
      {alertActive && (
          <div className="fixed inset-0 z-50 pointer-events-none border-[12px] border-red-500/20 animate-pulse"></div>
      )}
    </div>
  );
};

export default App;