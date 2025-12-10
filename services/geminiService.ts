import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are Sentinel-AI, an advanced visual security system. 
Your task is to analyze image frames from a surveillance feed in real-time.
Identify potential threats, specifically focusing on weapons (guns, knives, bats) or aggressive behavior.
Be concise.
`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    threatLevel: {
      type: Type.STRING,
      enum: ["SAFE", "WARNING", "CRITICAL"],
      description: "Critical if weapons are seen. Warning for suspicious objects. Safe otherwise."
    },
    detectedObjects: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of relevant objects detected (e.g., 'Handgun', 'Knife', 'Person')."
    },
    summary: {
      type: Type.STRING,
      description: "A very short, tactical description of the scene (max 10 words)."
    }
  },
  required: ["threatLevel", "detectedObjects", "summary"]
};

export const analyzeSecurityFrame = async (base64Image: string): Promise<GeminiAnalysisResult> => {
  try {
    // Remove header if present (data:image/jpeg;base64,)
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: "Analyze this surveillance frame for threats."
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Low temperature for consistent, factual reporting
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GeminiAnalysisResult;
    }
    
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Sentinel Analysis Failed:", error);
    return {
      threatLevel: "SAFE", // Default to safe on error to prevent panic
      detectedObjects: [],
      summary: "System Error - Analysis Failed"
    };
  }
};