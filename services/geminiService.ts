import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Medication, Product } from "../types";

// Initialize the client
const getAiClient = () => {
  const apiKey = process.env.API_KEY || ''; 
  return new GoogleGenAI({ apiKey });
};

// 1. General Medical Assistant Chat
export const sendChatMessage = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  customSystemInstruction?: string
): Promise<string> => {
  try {
    const ai = getAiClient();
    
    const baseInstruction = `You are MediSync, a helpful, empathetic medical AI assistant. 
    Your goal is to explain medical concepts simply, provide reminders, and suggest lifestyle improvements.
    
    CRITICAL SAFETY RULES:
    1. NEVER diagnose a condition.
    2. NEVER tell a patient to stop prescribed medication without doctor consultation.
    3. If symptoms seem severe (chest pain, difficulty breathing, heavy bleeding), advise them to call emergency services immediately.
    4. Keep answers concise and actionable.`;

    const systemInstruction = customSystemInstruction 
      ? `${baseInstruction}\n\nCONTEXT_FROM_APP:\n${customSystemInstruction}`
      : baseInstruction;

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction
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
export const checkDrugInteractions = async (medications: Medication[]): Promise<{ hasInteractions: boolean; summary: string }> => {
  if (medications.length < 2) return { hasInteractions: false, summary: "No interactions found (single medication)." };

  const medList = medications.map(m => `${m.name} (${m.dosage})`).join(', ');
  
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following list of medications for potential drug-drug interactions, food interactions, or alcohol contraindications: ${medList}.
      
      Return ONLY valid JSON with this schema:
      {
        "hasInteractions": boolean,
        "summary": "string - Provide a list of interactions in very simple, plain English that a patient can easily understand. Avoid medical jargon. Use clear bullet points."
      }`,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    return { hasInteractions: false, summary: "Unable to verify interactions." };
  }
};

export const getDetailedInteractionExplanation = async (medications: Medication[]): Promise<string> => {
  const medList = medications.map(m => `${m.name} (${m.dosage})`).join(', ');
  
  try {
    const ai = getAiClient();
    // Using gemini-3-pro-preview with thinking for complex medical reasoning
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `The patient is taking: ${medList}.
      They have received a basic warning about interactions.
      Please provide a comprehensive, structured explanation.
      
      Use exactly these headers (starting with ###):
      ### 🛑 Why is this a risk?
      (Explain the interaction mechanism in very simple terms)
      
      ### 🤒 Symptoms to watch for
      (List specific signs the patient should look out for)
      
      ### ✅ Actionable Steps
      (Practical advice like 'Take 2 hours apart' or 'Take with food')
      
      Keep the tone empathetic, reassuring, and professional. Avoid complex jargon.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });
    return response.text || "Detailed analysis not available.";
  } catch (error) {
    console.error("Detailed Interaction Error:", error);
    return "Unable to generate detailed explanation.";
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

// 5. Smart Product Search (Marketplace)
export const smartProductSearch = async (query: string, products: Product[]): Promise<string[]> => {
  try {
    const ai = getAiClient();
    
    const productCatalog = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        User Search Query: "${query}"
        
        Available Products Catalog:
        ${JSON.stringify(productCatalog)}

        Task: Identify which products from the catalog are relevant to the user's search query. 
        The user might describe symptoms (e.g., "headache") or look for categories (e.g., "sleep").
        
        Return ONLY a JSON array of strings containing the 'id' of the matching products.
        Example: ["p1", "p4"]
        If no products match, return [].
      `,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "[]";
    const ids = JSON.parse(text);
    return Array.isArray(ids) ? ids : [];
  } catch (error) {
    console.error("Smart Search Error:", error);
    return [];
  }
};

// 6. Scan Prescription/Product to Cart (Marketplace)
export const analyzePrescriptionAndMatch = async (base64Image: string, products: Product[]): Promise<{ productId: string, quantity: number, confidence: string }[]> => {
  try {
    const ai = getAiClient();
    
    // Simplified catalog for the model
    const productCatalog = products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category
    }));

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
            text: `Analyze this image. It is likely a photo of a medicine box, a pill bottle, or a handwritten prescription.
            
            1. Identify the medication names or types visible in the image.
            2. Cross-reference these findings with the "Available Catalog" below.
            3. If a match is found in the catalog, return the 'productId'.
            4. Suggest a quantity (default to 1 if not specified in image).
            5. If no exact match is found but a category match is strong (e.g. image shows generic ibuprofen, catalog has 'PainAway Ibuprofen'), match it.

            Available Catalog:
            ${JSON.stringify(productCatalog)}

            Return ONLY valid JSON with this schema:
            [
              {
                "productId": "string (id from catalog)",
                "quantity": number,
                "confidence": "High" | "Medium" | "Low"
              }
            ]
            
            If nothing matches, return [].`
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Prescription Scan Error:", error);
    return [];
  }
};

// 7. Extract Medication Details (Patient Schedule)
export const extractMedicationDetails = async (base64Image: string): Promise<Partial<Medication> | null> => {
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
            text: `Analyze this image of a medication label, bottle, or prescription.
            Extract the following details to create a schedule:
            - Name (string)
            - Dosage (string, e.g. "500mg")
            - Frequency (string, e.g. "Daily", "2x Daily", "3x Daily", "Weekly")
            - Instructions (string, brief instructions like "Take with food")
            - Times (array of strings in HH:MM 24h format. Infer based on frequency. Default to ["09:00"] for Daily, ["09:00", "20:00"] for 2x Daily, etc.)
            
            Return ONLY valid JSON with this schema:
            {
              "name": "string",
              "dosage": "string",
              "frequency": "string",
              "instructions": "string",
              "times": ["09:00"]
            }
            `
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
    console.error("Extract Med Error:", error);
    return null;
  }
};

// 8. Generate Dietary Recommendations
export const getDietaryRecommendations = async (conditions: string[], medications: Medication[]): Promise<{
    recommended: { item: string, benefit: string }[],
    avoid: { item: string, risk: string }[],
    summary: string
}> => {
  try {
    const ai = getAiClient();
    const medNames = medications.map(m => m.name).join(', ');
    const conditionList = conditions.join(', ');

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for deeper reasoning on bio-interactions
      contents: `
        Patient Profile:
        Conditions: ${conditionList || 'None listed'}
        Current Medications: ${medNames || 'None'}

        Task: Analyze the patient's condition and medications to generate a personalized diet plan. 
        Identify foods that are specifically beneficial (synergistic) and foods that should be avoided (contraindicated).

        Return ONLY valid JSON with this schema:
        {
          "recommended": [
             { "item": "Food Item Name", "benefit": "Brief reason why it helps" }
          ],
          "avoid": [
             { "item": "Food Item Name", "risk": "Brief interaction risk or negative effect" }
          ],
          "summary": "A 2-sentence encouraging summary of this dietary approach."
        }
      `,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4096 } // Moderate thinking budget for nutritional analysis
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Diet Recommendation Error:", error);
    return {
      recommended: [{ item: "Lean Proteins", benefit: "General health" }],
      avoid: [{ item: "Processed Foods", risk: "General health" }],
      summary: "We couldn't generate a personalized plan, but a balanced diet is always recommended."
    };
  }
};

// 9. Generate Smart Chat Replies
export const generateSmartReplies = async (
  lastMessage: string,
  role: 'doctor' | 'patient'
): Promise<string[]> => {
  try {
    const ai = getAiClient();
    const prompt = role === 'doctor'
      ? `You are a doctor replying to a patient. The patient said: "${lastMessage}". Generate 3 professional, short, concise quick-reply options (max 10 words each) for the doctor. Return JSON array of strings.`
      : `You are a patient replying to a doctor. The doctor said: "${lastMessage}". Generate 3 natural, short quick-reply options (max 10 words each) for the patient. Return JSON array of strings.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Smart Reply Error:", error);
    return [];
  }
};