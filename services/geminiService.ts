import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Medication } from "../types";

// Initialize the client
const getAiClient = () => {
  const apiKey = process.env.API_KEY || ''; 
  return new GoogleGenAI({ apiKey });
};

// 1. General Medical Assistant Chat
export const sendChatMessage = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string
): Promise<string> => {
  try {
    const ai = getAiClient();
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are MediSync, a helpful, empathetic medical AI assistant. 
        Your goal is to explain medical concepts simply, provide reminders, and suggest lifestyle improvements.
        CRITICAL SAFETY RULES:
        1. NEVER diagnose a condition.
        2. NEVER tell a patient to stop prescribed medication without doctor consultation.
        3. If symptoms seem severe (chest pain, difficulty breathing, heavy bleeding), advise them to call emergency services immediately.
        4. Keep answers concise and actionable.`
      },
      history: history.map(h => ({ role: h.role, parts: h.parts }))
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I apologize, I couldn't process that response.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm having trouble connecting to the medical database right now. Please try again later.";
  }
};

// 2. Drug Interaction Checker
export const checkDrugInteractions = async (medications: Medication[]): Promise<string> => {
  if (medications.length < 2) return "No interactions found (single medication).";

  const medList = medications.map(m => `${m.name} (${m.dosage})`).join(', ');
  
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following list of medications for potential drug-drug interactions, food interactions, or alcohol contraindications: ${medList}.
      
      Format the response as a clear list. Use "Major:" or "Moderate:" or "Minor:" as prefixes for bullet points if issues exist.
      If there are no known serious interactions, explicitly state that.
      Keep it brief and easy to read for a patient.`,
    });
    return response.text || "Analysis complete.";
  } catch (error) {
    return "Unable to verify interactions at this time.";
  }
};

// 3. Wound Analysis (Vision)
export const analyzeWoundImage = async (base64Image: string): Promise<{ severity: number; analysis: string; recommendations: string[] }> => {
  try {
    const ai = getAiClient();
    
    // We want a structured JSON response for the app to consume
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `Analyze this image of a wound. 
            Identify signs of infection (redness, pus, swelling).
            Estimate severity on a scale of 1-10 (1=minor scratch, 10=emergency).
            Provide 3 non-diagnostic first aid steps.
            
            Return ONLY valid JSON with this schema:
            {
              "severity": number,
              "analysis": "string description",
              "recommendations": ["step 1", "step 2", "step 3"]
            }`
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return {
      severity: data.severity || 0,
      analysis: data.analysis || "Could not analyze image clearly.",
      recommendations: data.recommendations || ["Consult a doctor."]
    };

  } catch (error) {
    console.error("Vision Error:", error);
    return {
      severity: 0,
      analysis: "Error analyzing image. Please ensure the photo is clear and try again.",
      recommendations: ["Consult a doctor manually."]
    };
  }
};

// 4. Pill Verification (Vision)
export const identifyPill = async (base64Image: string): Promise<{ name: string; description: string; confidence: string; warning?: string }> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `Identify this pill. Analyze its shape, color, and any visible imprints.
            Provide the likely medication name and a brief visual description.
            Assess confidence level (High/Medium/Low).
            
            Return ONLY valid JSON with this schema:
            {
              "name": "Likely Name",
              "description": "Visual description (e.g. White round tablet with '10' imprint)",
              "confidence": "High" | "Medium" | "Low",
              "warning": "Optional warning if identification is difficult"
            }`
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Pill ID Error:", error);
    return {
      name: "Unknown",
      description: "Could not identify pill.",
      confidence: "Low",
      warning: "Please consult your pharmacist."
    };
  }
};