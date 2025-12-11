import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as faceapi from 'face-api.js';
import { AuthorizedPerson, FrameAnalysisResult, DetectedItem } from '../types';

// Constants
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

class SurveillanceService {
  private objectModel: cocoSsd.ObjectDetection | null = null;
  private faceMatcher: faceapi.FaceMatcher | null = null;
  private isLoaded = false;
  private faceApiLoaded = false;

  async loadModels() {
    if (this.isLoaded) return;

    try {
      // Explicitly set backend to WebGL for GPU acceleration
      await tf.setBackend('webgl');
      await tf.ready();
      console.log(`TFJS Backend initialized: ${tf.getBackend()}`);
    } catch (err) {
      console.warn("WebGL backend initialization failed:", err);
      // Allow fallback to CPU if WebGL fails, but prefer WebGL
    }
    
    // Enable production mode for performance
    tf.enableProdMode();

    // Load COCO-SSD
    console.log('Loading Object Detection Model...');
    this.objectModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    console.log('COCO-SSD Loaded.');

    // Load Face-API
    console.log('Loading Biometric Models...');
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      // Load SSD MobileNet for better accuracy during static enrollment (optional but recommended for enrollment)
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL); 
      
      this.faceApiLoaded = true;
      console.log('Face-API Loaded.');
    } catch (e) {
      console.warn("Face-API failed to load. Biometrics disabled.", e);
      this.faceApiLoaded = false;
    }

    this.isLoaded = true;
  }

  updateFaceDatabase(people: AuthorizedPerson[]) {
    if (people.length === 0 || !this.faceApiLoaded) {
      this.faceMatcher = null;
      return;
    }
    try {
      const labeledDescriptors = people.map(person => {
        const descriptors = person.descriptors.map(d => new Float32Array(d));
        return new faceapi.LabeledFaceDescriptors(person.name, descriptors);
      });
      this.faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    } catch (e) {
      console.error("Error updating face database", e);
    }
  }

  async detect(media: HTMLVideoElement | HTMLImageElement): Promise<{
    analysis: FrameAnalysisResult;
    drawData: any;
  }> {
    if (!this.objectModel) throw new Error("Models not loaded");

    // Unified Safety Check
    let isValid = false;
    if (media instanceof HTMLVideoElement) {
        isValid = media.readyState >= 2 && !media.paused && !media.ended && media.videoWidth > 0;
    } else if (media instanceof HTMLImageElement) {
        isValid = media.complete && media.naturalWidth > 0;
    }

    if (!isValid) {
        return {
             analysis: { threatLevel: 'SAFE', identities: [], objects: [], details: [] },
             drawData: { objects: [], faces: [] }
        };
    }

    // 1. Object Detection
    // We await this, which is async, but heavy calculations happen on GPU
    const objectPredictions = await this.objectModel.detect(media, 10, 0.4);
    
    // CRITICAL PERFORMANCE FIX: Yield to main thread to allow UI updates/rendering
    // This prevents the "freeze" felt when activating surveillance
    await new Promise(resolve => setTimeout(resolve, 0));

    // 2. Face Detection
    let faceDetections: any[] = [];
    if (this.faceApiLoaded) {
        try {
            faceDetections = await faceapi.detectAllFaces(
                media, 
                new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.5 }) 
            ).withFaceLandmarks().withFaceDescriptors();
        } catch (err) {
            console.warn("Face detection warning", err);
        }
    }

    // 3. Analysis Logic
    const dangerousObjects = ['knife', 'scissors', 'baseball bat', 'gun', 'pistol', 'rifle']; 
    let threatLevel: FrameAnalysisResult['threatLevel'] = 'SAFE';
    const detectedItems: string[] = [];
    const detailedItems: DetectedItem[] = [];

    objectPredictions.forEach((obj: any) => {
      if (dangerousObjects.includes(obj.class)) {
        threatLevel = 'CRITICAL';
      }
      detectedItems.push(obj.class);
      detailedItems.push({
        type: 'object',
        label: obj.class,
        confidence: obj.score
      });
    });

    const identities: string[] = [];
    const faceResults: any[] = [];
    const faces = Array.isArray(faceDetections) ? faceDetections : [];

    faces.forEach((fd: any) => {
      let label = 'Unknown';
      let matchDistance = 1.0;

      if (this.faceMatcher) {
        const bestMatch = this.faceMatcher.findBestMatch(fd.descriptor);
        label = bestMatch.label;
        matchDistance = bestMatch.distance;
      }

      if (label === 'Unknown') {
        if (threatLevel !== 'CRITICAL') threatLevel = 'UNAUTHORIZED';
      } else {
        identities.push(label);
      }

      faceResults.push({
        box: fd.detection.box,
        label,
        distance: matchDistance
      });

      detailedItems.push({
        type: 'face',
        label: label,
        confidence: Math.max(0, 1 - matchDistance)
      });
    });

    return {
      analysis: {
        threatLevel,
        identities: identities.length > 0 ? identities : (faceResults.length > 0 ? ['Intruder'] : []),
        objects: detectedItems,
        details: detailedItems
      },
      drawData: {
        objects: objectPredictions,
        faces: faceResults
      }
    };
  }

  // Helper for static image processing (Enrollment)
  async processStaticImage(file: File): Promise<Float32Array | null> {
    if (!this.faceApiLoaded) throw new Error("Biometric models not loaded");

    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const reader = new FileReader();

      reader.onload = async () => {
        img.src = reader.result as string;
        img.onload = async () => {
            try {
                // Use SSD MobileNet for higher accuracy on static enrollment images
                const detection = await faceapi.detectSingleFace(
                    img, 
                    new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
                ).withFaceLandmarks().withFaceDescriptor();

                if (detection) {
                    resolve(detection.descriptor);
                } else {
                    resolve(null);
                }
            } catch (e) {
                reject(e);
            }
        };
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async getFaceDescriptor(media: HTMLVideoElement | HTMLImageElement): Promise<Float32Array | null> {
    if (!this.faceApiLoaded) return null;
    try {
        // Safety check for either media type
        if (media instanceof HTMLVideoElement && media.readyState < 2) return null;
        if (media instanceof HTMLImageElement && !media.complete) return null;

        const detection = await faceapi.detectSingleFace(
            media, 
            new faceapi.TinyFaceDetectorOptions({ inputSize: 256 })
        ).withFaceLandmarks().withFaceDescriptor();
      
        if (detection) return detection.descriptor;
    } catch(e) {
        console.warn("Face descriptor error", e);
    }
    return null;
  }
}

export const surveillanceService = new SurveillanceService();