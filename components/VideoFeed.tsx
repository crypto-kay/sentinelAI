import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AppConfig, SystemStatus, CameraDef } from '../types';
import { surveillanceService } from '../services/surveillanceService';
import { Loader2, AlertOctagon, SignalLow, VideoOff, ShieldAlert, AlertTriangle, ExternalLink, CloudLightning } from 'lucide-react';
import Hls from 'hls.js';

interface VideoFeedProps {
  camera: CameraDef;
  config: AppConfig;
  isMonitoring: boolean;
  onAnalysisResult: (cameraId: string, result: any) => void;
  onDelete?: () => void;
}

const TARGET_FPS = 24;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export const VideoFeed = React.memo<VideoFeedProps>(({ 
  camera,
  config, 
  isMonitoring, 
  onAnalysisResult,
  onDelete
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const lastDrawTimeRef = useRef<number>(0);
  const lastAnalysisTimeRef = useRef<number>(0);
  const isAnalyzingRef = useRef<boolean>(false);
  const latestDrawDataRef = useRef<any>({ objects: [], faces: [] });

  const [status, setStatus] = useState<SystemStatus>(SystemStatus.INITIALIZING);
  const [localThreatLevel, setLocalThreatLevel] = useState<'SAFE' | 'WARNING' | 'CRITICAL' | 'UNAUTHORIZED'>('SAFE');
  const [aiError, setAiError] = useState<string | null>(null);
  const [mixedContentError, setMixedContentError] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  // Detect Preview Window (Iframe) & URL
  useEffect(() => {
    try {
      const inIframe = window.self !== window.top;
      setIsIframe(inIframe);
      let url = window.location.href;
      if (url === 'about:srcdoc' || url === 'about:blank') {
         url = 'Run locally to view';
      }
      setCurrentUrl(url);
    } catch (e) {
      setIsIframe(true);
      setCurrentUrl('Unknown URL');
    }
  }, []);

  // Check for Mixed Content (HTTPS vs HTTP)
  useEffect(() => {
    if (camera.type === 'cloud_stream' && camera.url) {
      const isPageHttps = window.location.protocol === 'https:';
      const isStreamHttp = camera.url.startsWith('http:');
      if (isPageHttps && isStreamHttp) {
        setMixedContentError(true);
        setStatus(SystemStatus.ERROR);
      } else {
        setMixedContentError(false);
      }
    }
  }, [camera.type, camera.url]);

  // Initialize Models
  useEffect(() => {
    const init = async () => {
      try {
        await surveillanceService.loadModels();
        // If it's a stream, we might be ready faster or waiting for HLS load
        if (camera.type === 'cloud_stream' && !mixedContentError) {
             // Status managed by video events
        }
      } catch (e) {
        console.error("Model load failed", e);
      }
    };
    init();
  }, [camera.type, mixedContentError]);

  // Initialize Stream (Webcam or Cloud)
  useEffect(() => {
    let stream: MediaStream | null = null;
    let hls: Hls | null = null;
    const video = videoRef.current;

    if (!video) return;

    const handleVideoReady = () => {
        if (video.readyState >= 2) {
             setStatus(SystemStatus.READY);
        }
    };

    video.addEventListener('loadeddata', handleVideoReady);
    video.addEventListener('canplay', handleVideoReady);

    const startStream = async () => {
      // 1. Webcam Logic
      if (camera.type === 'webcam') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
          });
          video.srcObject = stream;
          video.play().catch(e => console.error("Webcam play failed", e));
        } catch (err) {
          console.error("Camera denied/failed", err);
          setStatus(SystemStatus.ERROR);
        }
      } 
      // 2. Cloud Stream Logic
      else if (camera.type === 'cloud_stream' && camera.url && !mixedContentError) {
          try {
              if (Hls.isSupported() && camera.url.endsWith('.m3u8')) {
                  hls = new Hls();
                  hls.loadSource(camera.url);
                  hls.attachMedia(video);
                  hls.on(Hls.Events.MANIFEST_PARSED, () => {
                      video.play().catch(e => console.error("HLS play failed", e));
                  });
                  hls.on(Hls.Events.ERROR, (event, data) => {
                      if (data.fatal) setStatus(SystemStatus.ERROR);
                  });
              } else if (video.canPlayType('application/vnd.apple.mpegurl') && camera.url.endsWith('.m3u8')) {
                  // Native HLS (Safari)
                  video.src = camera.url;
                  video.addEventListener('loadedmetadata', () => {
                      video.play();
                  });
              } else {
                  // Standard MP4/WebM
                  video.src = camera.url;
                  video.play().catch(e => {
                      console.error("Video play failed", e);
                      setStatus(SystemStatus.ERROR);
                  });
              }
          } catch (e) {
              console.error("Stream setup failed", e);
              setStatus(SystemStatus.ERROR);
          }
      }
    };

    startStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (hls) {
          hls.destroy();
      }
      if (video) {
        video.srcObject = null;
        video.src = "";
        video.removeEventListener('loadeddata', handleVideoReady);
        video.removeEventListener('canplay', handleVideoReady);
      }
    };
  }, [camera.type, camera.url, mixedContentError]);


  const animate = useCallback((timestamp: number) => {
    if (!canvasRef.current || !videoRef.current) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    const video = videoRef.current;
    
    // Check if video is actually playing and has data
    const isReady = video.readyState >= 2 && !video.paused && !video.ended;

    const elapsed = timestamp - lastDrawTimeRef.current;

    if (elapsed > FRAME_INTERVAL) {
      if (elapsed > FRAME_INTERVAL * 2) {
          lastDrawTimeRef.current = timestamp;
      } else {
          lastDrawTimeRef.current = timestamp - (elapsed % FRAME_INTERVAL);
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (isReady && ctx) {
        // Dimensions
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        canvas.width = width;
        canvas.height = height;
        
        ctx.save();
        if (camera.type === 'webcam') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch (e) {
            // Tainted canvas handled in AI loop catch
        }
        
        ctx.restore();

        // Draw Overlays (If not errored)
        if (isMonitoring && status === SystemStatus.READY) {
            const { objects, faces } = latestDrawDataRef.current;
            const isMirrored = camera.type === 'webcam';

            objects?.forEach((obj: any) => {
                let [x, y, w, h] = obj.bbox;
                if (isMirrored) x = canvas.width - x - w;
                
                const isWeapon = ['knife', 'scissors', 'baseball bat', 'gun', 'pistol'].includes(obj.class);
                
                ctx.strokeStyle = isWeapon ? '#ef4444' : '#eab308';
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = isWeapon ? '#ef4444' : '#eab308';
                ctx.fillRect(x, y - 20, ctx.measureText(obj.class).width + 10, 20);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 12px Inter';
                ctx.fillText(obj.class, x + 5, y - 5);
            });

            faces?.forEach((face: any) => {
                let { x, y, width, height } = face.box;
                if (isMirrored) x = canvas.width - x - width;

                const isUnknown = face.label === 'Unknown';
                const color = isUnknown ? '#ef4444' : '#10b981';

                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
                ctx.fillStyle = color;
                ctx.fillText(isUnknown ? "INTRUDER" : face.label, x + 5, y + height + 15);
            });
        }

        // Inference Logic
        const now = Date.now();
        const interval = config.analysisIntervalMs || 300;

        if (isMonitoring && 
            status === SystemStatus.READY && 
            !isAnalyzingRef.current && 
            !aiError &&
            (now - lastAnalysisTimeRef.current > interval)) {
          
          isAnalyzingRef.current = true;
          lastAnalysisTimeRef.current = now;

          surveillanceService.detect(video).then((result: any) => {
              latestDrawDataRef.current = result.drawData;
              setLocalThreatLevel(result.analysis.threatLevel);
              onAnalysisResult(camera.id, result.analysis);
              isAnalyzingRef.current = false;
          }).catch((err) => {
              isAnalyzingRef.current = false;
              // Check for CORS/Tainted canvas errors
              const errMsg = err?.message || '';
              if (errMsg.includes('SecurityError') || errMsg.includes('tainted') || errMsg.includes('pixels')) {
                 setAiError("CORS_BLOCK");
              }
          });
        }
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [isMonitoring, status, camera.type, camera.id, config.analysisIntervalMs, onAnalysisResult, aiError]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [animate]);

  // Determine Alert Styles
  const isCritical = localThreatLevel === 'CRITICAL' || localThreatLevel === 'UNAUTHORIZED';
  const isWarning = localThreatLevel === 'WARNING';
  
  const borderClass = isCritical 
    ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.6)] animate-pulse' 
    : isWarning 
      ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]' 
      : 'border-slate-800 hover:border-slate-600';

  return (
    <div className={`relative bg-black rounded-xl overflow-hidden border-2 transition-all duration-300 group w-full h-full ${borderClass}`}>
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start pointer-events-none">
        <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isCritical ? 'bg-red-500 animate-ping' : (status === SystemStatus.READY ? 'bg-green-500' : 'bg-slate-500')}`} />
            <span className="text-xs font-mono font-bold text-white shadow-sm">{camera.name}</span>
        </div>
        <div className="flex items-center gap-2">
            {aiError === 'CORS_BLOCK' && (
               <div className="flex items-center gap-1 bg-yellow-900/80 border border-yellow-700 px-2 py-0.5 rounded text-[10px] text-yellow-200">
                  <AlertTriangle size={10} />
                  <span>CORS BLOCKED</span>
               </div>
            )}
            {isCritical && <AlertOctagon size={16} className="text-red-500 animate-bounce" />}
            <span className="text-[10px] font-mono text-slate-400">{localThreatLevel}</span>
        </div>
      </div>

      {/* Delete Button (Pointer Events Active) */}
      {onDelete && (
          <button 
            onClick={onDelete}
            className="absolute top-2 right-2 z-30 p-1 bg-slate-900/50 hover:bg-red-900/80 rounded text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
          >
            <VideoOff size={14} />
          </button>
      )}

      {/* Critical Alert Full Overlay Flash */}
      {isCritical && (
          <div className="absolute inset-0 border-[6px] border-red-500/50 z-10 pointer-events-none animate-pulse"></div>
      )}

      {/* Video Content */}
      <div className="w-full h-full relative bg-slate-900 flex items-center justify-center">
          
          {/* Unified Video Element for Both Webcam and Cloud Stream */}
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            crossOrigin="anonymous" 
            className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none" 
          />
          
          {/* Visual Layer */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain" />
          
          {status === SystemStatus.INITIALIZING && !mixedContentError && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 className="animate-spin text-sentinel-accent" />
            </div>
          )}
          
          {mixedContentError && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400/80 z-10 bg-slate-900/90 p-4 text-center pointer-events-auto">
                <ShieldAlert size={32} />
                <span className="text-sm font-bold mt-2">SECURITY BLOCK</span>
                <p className="text-[10px] mt-1 max-w-[200px] text-slate-400">
                   HTTPS Page cannot load HTTP Cloud Stream.
                </p>
                {isIframe && (
                    <div className="mt-4 p-2 bg-slate-800/80 border border-slate-700 rounded max-w-[200px] text-left">
                         <p className="text-[10px] text-yellow-400 font-bold mb-1 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            PREVIEW RESTRICTED
                         </p>
                         <div className="mb-2 p-1.5 bg-black/50 rounded border border-slate-700">
                            <p className="text-[8px] text-slate-500 uppercase font-mono mb-0.5">Your App URL:</p>
                            <div className="text-[9px] font-mono text-sentinel-accent break-all select-all">
                                {currentUrl}
                            </div>
                         </div>
                         {currentUrl.startsWith('http') && (
                            <a 
                                href={currentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded transition-colors"
                            >
                                <ExternalLink size={10} />
                                OPEN IN NEW TAB
                            </a>
                         )}
                    </div>
                )}
             </div>
          )}

           {status === SystemStatus.ERROR && !mixedContentError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400/80 z-10 bg-slate-900/80 text-center p-4 pointer-events-auto">
                <SignalLow size={32} />
                <span className="text-xs mt-2 font-bold">STREAM FAILED</span>
                <p className="text-[10px] mt-1 text-slate-500">Check Stream URL and Connection.</p>
                
                {camera.type === 'cloud_stream' && (
                  <div className="mt-2 text-[9px] text-slate-400 max-w-[180px] bg-black/40 p-1.5 rounded">
                    Supported: HLS (.m3u8), MP4, WebM.
                    <br/>
                    Ensure server allows CORS.
                  </div>
                )}
            </div>
          )}
      </div>
    </div>
  );
});