import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { VideoFeed } from './components/VideoFeed';
import { LogPanel } from './components/LogPanel';
import { AppConfig, DetectionLog, FrameAnalysisResult, AuthorizedPerson, CameraDef } from './types';
import { surveillanceService } from './services/surveillanceService';
import { Plus, LayoutGrid, MonitorPlay, PanelBottom, PanelBottomClose, CloudLightning } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showLogs, setShowLogs] = useState(true);
  const [logs, setLogs] = useState<DetectionLog[]>([]);
  
  // Multi-Camera State
  const [cameras, setCameras] = useState<CameraDef[]>([
    { id: 'cam-01', name: 'CAM-01 (Main)', type: 'webcam', status: 'ACTIVE' }
  ]);
  const [newCamUrl, setNewCamUrl] = useState('');
  const [isAddingCam, setIsAddingCam] = useState(false);

  const [authorizedPeople, setAuthorizedPeople] = useState<AuthorizedPerson[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    minConfidence: 0.5,
    faceMatchThreshold: 0.6,
    analysisIntervalMs: 300,
    cameraSource: 'webcam'
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

  const addCamera = () => {
     if (newCamUrl) {
         setCameras([...cameras, {
             id: generateId(),
             name: `CLOUD-0${cameras.length + 1}`,
             type: 'cloud_stream',
             url: newCamUrl,
             status: 'ACTIVE'
         }]);
         setNewCamUrl('');
         setIsAddingCam(false);
     }
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

                 {isAddingCam ? (
                     <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                         <input 
                            type="text" 
                            value={newCamUrl}
                            onChange={(e) => setNewCamUrl(e.target.value)}
                            placeholder="Stream URL (.m3u8, .mp4)..."
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs w-32 sm:w-64 focus:border-sentinel-accent focus:outline-none"
                         />
                         <button onClick={addCamera} className="bg-sentinel-accent hover:bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap">ADD</button>
                         <button onClick={() => setIsAddingCam(false)} className="text-slate-400 hover:text-white px-2">Cancel</button>
                     </div>
                 ) : (
                    <button 
                        onClick={() => setIsAddingCam(true)}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded text-xs font-bold transition-colors border border-slate-700 whitespace-nowrap"
                    >
                        <Plus size={14} />
                        ADD STREAM
                    </button>
                 )}
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
                        onClick={() => setIsAddingCam(true)}
                        className="min-h-[250px] bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600 hover:border-slate-600 hover:text-slate-400 cursor-pointer transition-all group"
                      >
                          <CloudLightning size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-mono font-bold">ADD CLOUD STREAM</span>
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

      <ControlPanel 
        config={config} 
        onConfigChange={(newConfig) => setConfig(prev => ({...prev, ...newConfig}))} 
        isMonitoring={isMonitoring}
        onToggleMonitoring={() => setIsMonitoring(!isMonitoring)}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        authorizedPeople={authorizedPeople}
        onRemovePerson={handleRemovePerson}
        onEnrollMode={() => {}} // Enroll disabled for multi-cam MVP
      />
      
      {/* Global Alert Overlay */}
      {alertActive && (
          <div className="fixed inset-0 z-50 pointer-events-none border-[12px] border-red-500/20 animate-pulse"></div>
      )}
    </div>
  );
};

export default App;