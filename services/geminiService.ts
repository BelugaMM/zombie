import { GoogleGenAI, Type } from "@google/genai";
import { Item, ItemType } from '../types';
import { MATERIAL_NAMES } from '../constants';

let ai: GoogleGenAI | null = null;

try {
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (error) {
  console.error("Failed to initialize Gemini Client", error);
}

export const generateLocationDescription = async (
  buildingType: string, 
  weather: string, 
  timeOfDay: string
): Promise<string> => {
  if (!ai) return `你进入了${buildingType === 'House' ? '一所房子' : '一栋建筑'}。四周静悄悄的。`;

  try {
    const prompt = `Describe the interior of a ${buildingType} in a zombie apocalypse setting. 
    Conditions: ${weather}, ${timeOfDay}.
    Keep it atmospheric, gritty, and under 40 words. 
    Focus on sensory details (smell, sight).
    **IMPORTANT: Respond in Simplified Chinese (简体中文).**`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `你走进了${buildingType === 'House' ? '房子' : '建筑'}。灰尘在凝滞的空气中飞舞。`;
  }
};

export const scavengeLocation = async (
  buildingType: string
): Promise<{ flavorText: string; items: Partial<Item>[] }> => {
  // Fallback items with materials
  const fallbackItems = [
     { name: MATERIAL_NAMES.WOOD, type: ItemType.RESOURCE, value: 1, description: "建筑和制作的基础材料。" },
     { name: "罐头豆子", type: ItemType.FOOD, value: 15, description: "还能吃。" }
  ];

  if (!ai) {
    return {
      flavorText: "你在架子上翻找...",
      items: fallbackItems
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The player is scavenging a ${buildingType} in a zombie survival game.
      Generate a short action description (max 1 sentence) in Simplified Chinese.
      Generate a list of 1-3 items found.
      
      **CRITICAL**: You MUST include crafting materials often (木材, 金属废料, 布料).
      
      Item Types: weapon, food, medical, resource.
      Value: 1-50.
      
      Output JSON with 'flavorText' and 'items'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flavorText: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["weapon", "food", "medical", "resource"] },
                  description: { type: Type.STRING },
                  value: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text");
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Loot Error:", error);
    return {
      flavorText: "你仔细搜寻，但只找到了一些破烂。",
      items: [{ name: MATERIAL_NAMES.CLOTH, type: ItemType.RESOURCE, value: 0, description: "一块脏布。" }]
    };
  }
};

export const generateCombatEvent = async (action: string, playerHp: number, zombieHp: number): Promise<string> => {
    if(!ai) return "你攻击了丧尸！";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Describe a combat action in a zombie game. 
            Player Action: ${action}. 
            Player HP: ${playerHp}%. 
            Zombie HP: ${zombieHp} (just took damage).
            Keep it visceral and very short (max 10 words).
            **Respond in Simplified Chinese.**`
        });
        return response.text.trim();
    } catch (e) {
        return "你重击了不死怪物！";
    }
}