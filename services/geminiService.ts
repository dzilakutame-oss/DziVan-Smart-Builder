import { GoogleGenAI } from "@google/genai";
import { EstimateResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDrawing = async (
  base64Data: string, 
  mimeType: string,
  fileName: string,
  fileId: string
): Promise<EstimateResult> => {
  
  const modelId = "gemini-2.5-flash"; 
  
  const prompt = `
    You are an expert construction estimator and quantity surveyor familiar with the West African market (specifically Ghana). 
    Analyze the attached architectural drawing, site plan, or document.
    
    File Name: "${fileName}"
    
    TASKS:
    1. **Identify the Scope**: Determine if this is a full floor plan, a site plan (land), or a specific detail.
    2. **Wall & Site Calculation**: If this is a SITE PLAN or features walls/fences:
       - Calculate the number of blocks (standard 5" or 6" hollow) needed for the perimeter/walls.
       - Estimate bags of cement, cubic yards/tonnes of sand and stones required for these walls.
    3. **Material Breakdown**: Extract a detailed list of materials.
    4. **Market Prices**: Use Google Search to find CURRENT average market prices in Ghana (GHS).
    5. **Trends**: Estimate if the price for each category (Cement, Steel, Wood) is currently Trending UP, DOWN, or STABLE in Ghana based on recent economic news.
       - **Crucial**: Provide a simplified "priceHistory" array containing 6 numbers representing the relative price index for the last 6 months (e.g., [95, 96, 98, 99, 102, 105] for an upward trend).
    6. **Alternative Units**: For bulk items (Concrete, Sand, Stones), provide conversion units if possible (e.g., if primary is 'm3', provide 'cubic yards' or 'tonnes' as secondary).
    
    OUTPUT FORMAT (JSON ONLY):
    {
      "projectName": "Descriptive name derived from file content",
      "currency": "GHS",
      "marketRegion": "Ghana (Accra/Kumasi Avg)",
      "totalBudget": 0,
      "marketTrends": [
        { "category": "Cement", "trend": "UP", "percentageChange": 5, "priceHistory": [95, 96, 98, 100, 102, 105] },
        { "category": "Steel", "trend": "STABLE", "percentageChange": 0, "priceHistory": [100, 101, 99, 100, 100, 100] }
      ],
      "breakdown": [
        {
          "category": "Masonry",
          "material": "6-inch Hollow Cement Blocks",
          "quantity": 1500,
          "unit": "pcs",
          "unitPrice": 9.50,
          "totalPrice": 14250.00,
          "notes": "Calculated for 150m perimeter wall height 2.4m",
          "secondaryQuantity": null,
          "secondaryUnit": null
        },
        {
          "category": "Concrete",
          "material": "River Sand",
          "quantity": 15,
          "unit": "m3",
          "unitPrice": 150.00,
          "totalPrice": 2250.00,
          "notes": "For block laying and plastering",
          "secondaryQuantity": 19.6,
          "secondaryUnit": "cubic yards"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      }
    });

    const text = response.text;
    
    if (!text) {
      throw new Error("No response generated from AI.");
    }

    // Robust JSON extraction: Find the first '{' and the last '}'
    // This ignores any conversational wrapper text like "Here is the JSON: ```json ... ```"
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1) {
       throw new Error("Valid JSON not found in response.");
    }

    const jsonString = text.substring(startIndex, endIndex + 1);
    
    const data = JSON.parse(jsonString);
    
    // Inject file metadata
    return {
        ...data,
        fileId,
        fileName
    } as EstimateResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(`Failed to analyze ${fileName}. Please try again.`);
  }
};