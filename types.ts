export interface DetectedItem {
  type: 'object' | 'face';
  label: string;
  confidence: number;
}

export interface DetectionLog {
  id: string;
  cameraId: string; // New: Identify which camera saw the threat
  cameraName: string;
  timestamp: string;
  threatLevel: 'SAFE' | 'WARNING' | 'CRITICAL' | 'UNAUTHORIZED';
  detectedObjects: string[];
  description: string;
  details?: DetectedItem[];
  aiReasoning?: string; 
}

export interface CameraDef {
  id: string;
  name: string;
  type: 'webcam' | 'ip_camera';
  url?: string;
  status: 'ACTIVE' | 'OFFLINE' | 'ERROR';
}

export interface AppConfig {
  minConfidence: number; 
  faceMatchThreshold: number; 
  analysisIntervalMs?: number; 
  cameraSource?: 'webcam' | 'ip_camera';
  ipCameraUrl?: string;
}

export enum SystemStatus {
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}

export interface AuthorizedPerson {
  id: string;
  name: string;
  role: string;
  descriptors: number[][]; 
  createdAt: number;
}

export interface FrameAnalysisResult {
  threatLevel: 'SAFE' | 'WARNING' | 'CRITICAL' | 'UNAUTHORIZED';
  identities: string[]; 
  objects: string[]; 
  details: DetectedItem[];
}