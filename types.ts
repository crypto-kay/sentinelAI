export interface DetectedItem {
  type: 'object' | 'face';
  label: string;
  confidence: number;
}

export interface DetectionLog {
  id: string;
  cameraId: string; 
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
  type: 'webcam' | 'cloud_stream';
  url?: string;
  status: 'ACTIVE' | 'OFFLINE' | 'ERROR';
}

export interface AppConfig {
  minConfidence: number; 
  faceMatchThreshold: number; 
  analysisIntervalMs?: number; 
  performanceMode: 'HIGH' | 'BALANCED' | 'LOW_POWER';
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