import React, { useState, useRef } from 'react';
import { X, Upload, CheckCircle, AlertTriangle, User, Loader2, FileImage } from 'lucide-react';
import { surveillanceService } from '../services/surveillanceService';

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (name: string, role: string, descriptors: number[][]) => void;
}

export const EnrollmentModal: React.FC<EnrollmentModalProps> = ({ isOpen, onClose, onEnroll }) => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Single Enroll State
  const [singleName, setSingleName] = useState('');
  const [singleRole, setSingleRole] = useState('Authorized');
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singleStatus, setSingleStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Bulk Enroll State
  const [bulkFiles, setBulkFiles] = useState<FileList | null>(null);
  const [bulkRole, setBulkRole] = useState('Employee');

  if (!isOpen) return null;

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleFile || !singleName) return;

    setProcessing(true);
    setSingleStatus('idle');
    try {
        const descriptor = await surveillanceService.processStaticImage(singleFile);
        if (descriptor) {
            // Convert Float32Array to standard array for storage
            onEnroll(singleName, singleRole, [Array.from(descriptor)]);
            setSingleStatus('success');
            setSingleName('');
            setSingleFile(null);
        } else {
            setSingleStatus('error');
            setLogs(prev => [`Failed to detect face in ${singleFile.name}. Try a clearer photo.`, ...prev]);
        }
    } catch (e) {
        setSingleStatus('error');
        setLogs(prev => [`Error processing ${singleFile.name}`, ...prev]);
    } finally {
        setProcessing(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkFiles || bulkFiles.length === 0) return;

    setProcessing(true);
    setLogs([]);
    let successCount = 0;
    let failCount = 0;

    const files: File[] = Array.from(bulkFiles);
    
    for (const file of files) {
        try {
            // Assume filename is name (e.g. "John Doe.jpg" -> "John Doe")
            const name = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
            setLogs(prev => [`Processing: ${name}...`, ...prev]);

            const descriptor = await surveillanceService.processStaticImage(file);
            
            if (descriptor) {
                onEnroll(name, bulkRole, [Array.from(descriptor)]);
                successCount++;
                setLogs(prev => [`✅ Enrolled: ${name}`, ...prev]);
            } else {
                failCount++;
                setLogs(prev => [`❌ Failed: No face found in ${file.name}`, ...prev]);
            }
        } catch (e) {
            failCount++;
            setLogs(prev => [`⚠️ Error: Could not process ${file.name}`, ...prev]);
        }
    }

    setLogs(prev => [`DONE. Success: ${successCount}, Failed: ${failCount}`, ...prev]);
    setProcessing(false);
    setBulkFiles(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-slate-950 border border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <div>
                <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                    <User size={20} className="text-sentinel-accent" />
                    PERSONNEL ENROLLMENT
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1">Biometric Database Management</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50">
            <button 
                onClick={() => setMode('single')}
                className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${mode === 'single' ? 'bg-sentinel-accent/10 text-sentinel-accent border-b-2 border-sentinel-accent' : 'text-slate-500 hover:text-slate-300'}`}
            >
                SINGLE ENTRY
            </button>
            <button 
                onClick={() => setMode('bulk')}
                className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${mode === 'bulk' ? 'bg-sentinel-accent/10 text-sentinel-accent border-b-2 border-sentinel-accent' : 'text-slate-500 hover:text-slate-300'}`}
            >
                BULK IMPORT
            </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950">
            {mode === 'single' ? (
                <form onSubmit={handleSingleSubmit} className="space-y-6 max-w-md mx-auto">
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase">Full Name</label>
                        <input 
                            type="text" 
                            required
                            value={singleName}
                            onChange={e => setSingleName(e.target.value)}
                            placeholder="e.g. Officer John Smith"
                            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-sentinel-accent focus:outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase">Role / Access Level</label>
                        <select 
                            value={singleRole}
                            onChange={e => setSingleRole(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-sentinel-accent focus:outline-none"
                        >
                            <option value="Authorized">Authorized Personnel</option>
                            <option value="Admin">Administrator</option>
                            <option value="Security">Security Staff</option>
                            <option value="VIP">VIP</option>
                        </select>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase">Reference Photo</label>
                        <div className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${singleFile ? 'border-sentinel-accent bg-sentinel-accent/5' : 'border-slate-700 hover:border-slate-500 bg-slate-900'}`}>
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={e => {
                                    if(e.target.files?.[0]) {
                                        setSingleFile(e.target.files[0]);
                                        setSingleStatus('idle');
                                    }
                                }}
                                className="hidden" 
                                id="single-upload"
                            />
                            <label htmlFor="single-upload" className="cursor-pointer flex flex-col items-center">
                                {singleFile ? (
                                    <>
                                        <FileImage size={32} className="text-sentinel-accent mb-2" />
                                        <span className="text-sm font-bold text-white">{singleFile.name}</span>
                                        <span className="text-xs text-slate-500 mt-1">Click to change</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={32} className="text-slate-500 mb-2" />
                                        <span className="text-sm font-bold text-slate-400">Click to Upload Photo</span>
                                        <span className="text-xs text-slate-600 mt-1">JPG or PNG (Min 500x500px)</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    {singleStatus === 'success' && (
                        <div className="p-3 bg-green-900/30 border border-green-800 rounded flex items-center gap-2 text-green-400 text-sm">
                            <CheckCircle size={16} />
                            <span>Successfully enrolled {singleName}.</span>
                        </div>
                    )}
                    {singleStatus === 'error' && (
                        <div className="p-3 bg-red-900/30 border border-red-800 rounded flex items-center gap-2 text-red-400 text-sm">
                            <AlertTriangle size={16} />
                            <span>Enrollment failed. See logs.</span>
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={processing || !singleFile}
                        className="w-full py-3 bg-sentinel-accent hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded flex items-center justify-center gap-2 transition-all"
                    >
                        {processing ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />}
                        {processing ? 'ANALYZING BIOMETRICS...' : 'ENROLL PERSONNEL'}
                    </button>
                </form>
            ) : (
                <div className="space-y-6">
                    <div className="bg-slate-900 p-4 rounded border border-slate-800">
                        <h4 className="font-bold text-white mb-2 text-sm">Bulk Import Instructions</h4>
                        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                            <li>Upload multiple image files at once.</li>
                            <li><strong>Filename will be used as the person's name.</strong></li>
                            <li>Example: "Sarah_Connor.jpg" &rarr; Name: "Sarah Connor"</li>
                            <li>Ensure faces are clearly visible.</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-mono text-slate-400 uppercase">Default Role</label>
                        <select 
                            value={bulkRole}
                            onChange={e => setBulkRole(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-sentinel-accent focus:outline-none text-sm"
                        >
                             <option value="Employee">Employee</option>
                             <option value="Authorized">Authorized Personnel</option>
                             <option value="Visitor">Visitor</option>
                        </select>
                    </div>

                    <div className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center transition-colors ${bulkFiles ? 'border-sentinel-accent bg-sentinel-accent/5' : 'border-slate-700 hover:border-slate-500 bg-slate-900'}`}>
                        <input 
                            type="file" 
                            accept="image/*"
                            multiple
                            onChange={e => setBulkFiles(e.target.files)}
                            className="hidden" 
                            id="bulk-upload"
                        />
                        <label htmlFor="bulk-upload" className="cursor-pointer flex flex-col items-center text-center">
                            <Upload size={48} className="text-slate-500 mb-4" />
                            {bulkFiles ? (
                                <>
                                    <span className="text-lg font-bold text-white">{bulkFiles.length} Files Selected</span>
                                    <span className="text-sm text-slate-500 mt-1">Ready to process</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-lg font-bold text-slate-400">Drag Photos Here</span>
                                    <span className="text-sm text-slate-600 mt-1">or Click to Browse</span>
                                </>
                            )}
                        </label>
                    </div>

                    <button 
                        onClick={handleBulkSubmit}
                        disabled={processing || !bulkFiles}
                        className="w-full py-3 bg-sentinel-accent hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded flex items-center justify-center gap-2 transition-all"
                    >
                        {processing ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
                        {processing ? 'PROCESSING BATCH...' : 'START BULK ENROLLMENT'}
                    </button>
                </div>
            )}

            {/* Logs Area */}
            {logs.length > 0 && (
                <div className="mt-6 border-t border-slate-800 pt-4">
                    <h4 className="text-xs font-mono text-slate-500 uppercase mb-2">Process Log</h4>
                    <div className="bg-black/50 rounded p-3 h-32 overflow-y-auto font-mono text-xs space-y-1 scrollbar-thin">
                        {logs.map((log, i) => (
                            <div key={i} className={log.includes('Failed') || log.includes('Error') ? 'text-red-400' : 'text-slate-300'}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
