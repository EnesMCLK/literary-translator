
import { GoogleGenAI, Type } from "@google/genai";
import { UILanguage } from "../App";
import { UsageStats } from "./epubService";

export interface BookStrategy {
  genre_en: string;
  tone_en: string;
  author_style_en: string;
  strategy_en: string;
  genre_translated: string;
  tone_translated: string;
  author_style_translated: string;
  strategy_translated: string;
  literary_fidelity_note: string;
  detected_creativity_level: number; // 0.1 to 1.0
}

export class GeminiTranslator {
  private modelName: string;
  private temperature: number;
  private sourceLanguage: string;
  private targetLanguage: string;
  private cachePrefix = 'lit-trans-v4-';
  private bookStrategy: BookStrategy | null = null;
  private lastTranslation: string = "";
  private usage: UsageStats = {
    promptTokens: 0,
    candidatesTokens: 0,
    totalTokens: 0
  };

  constructor(
    temperature: number = 0.3, 
    sourceLanguage: string = 'Auto', 
    targetLanguage: string = 'Turkish',
    modelId: string = 'gemini-3-flash-preview'
  ) {
    this.temperature = temperature;
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    this.modelName = modelId;
  }

  private getApiKey(): string {
    return (window as any).manualApiKey || process.env.API_KEY || "";
  }

  setStrategy(strategy: BookStrategy) {
    this.bookStrategy = strategy;
    // Apply dynamic temperature based on strategy and user constraints
    if (strategy.detected_creativity_level) {
      this.temperature = strategy.detected_creativity_level;
    }
  }

  updateTemperature(newTemp: number) {
    this.temperature = Math.max(0, Math.min(1, newTemp));
  }

  getUsage(): UsageStats {
    return { ...this.usage };
  }

  getLastTranslation(): string {
    return this.lastTranslation;
  }

  private getSystemInstruction(): string {
    const contextPart = this.bookStrategy 
      ? `LITERARY MASTER PROFILE:
        - Author Fingerprint: ${this.bookStrategy.author_style_en}
        - Genre & Tone: ${this.bookStrategy.genre_en} (${this.bookStrategy.tone_en})
        - Execution Strategy: ${this.bookStrategy.strategy_en}`
      : "Apply expert-level literary translation.";

    return `ACT AS: A world-class award-winning literary translator.

MISSION:
Translate text from ${this.sourceLanguage} to ${this.targetLanguage} with absolute stylistic precision.

${contextPart}

CORE MANDATES:
1. **NO CENSORSHIP:** Translate exactly what the author wrote, including profanity, controversial themes, or extreme emotions. Do not sanitize the text.
2. **STYLE OVER LITERALISM:** Capture the 'ghost' of the author. If the author is poetic, be poetic. If they are gritty and concise, mimic that rhythm.
3. **HTML INTEGRITY:** Never touch tags (<p>, <span>, etc.) or classes. Only translate text content.
4. **VOCABULARY DEPTH:** Use the full richness of ${this.targetLanguage}. Avoid generic words; use terms that match the book's era and social context.
5. **CONSISTENCY:** Maintain character voices and specialized terminology throughout the entire book.

OUTPUT: Provide only the translated HTML. No commentary.`;
  }

  private getCacheKey(text: string): string {
    return `${this.cachePrefix}${this.sourceLanguage}-${this.targetLanguage}-${this.temperature}-${this.modelName}-${text.trim()}`;
  }

  private getFromCache(text: string): string | null {
    try {
      return localStorage.getItem(this.getCacheKey(text));
    } catch {
      return null;
    }
  }

  private saveToCache(text: string, translated: string): void {
    try {
      localStorage.setItem(this.getCacheKey(text), translated);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(this.cachePrefix)) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      }
    }
  }

  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        if (error?.status === 429) {
          await new Promise(r => setTimeout(r, Math.pow(2, i) * 2000));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async analyzeBook(metadata: any, coverInfo?: { data: string, mimeType: string }, uiLang: UILanguage = 'en'): Promise<BookStrategy> {
    // Initializing with mandatory structure as per guidelines
    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    
    const prompt = `Perform a deep literary analysis in the SOURCE language of this book. 
    Identify the author's unique style, historical context, and linguistic complexity.
    
    BOOK DATA:
    Title: ${metadata.title}
    Author: ${metadata.creator}
    Snippet: ${metadata.description}

    REQUIREMENTS for the JSON response:
    1. 'genre_en', 'tone_en', 'author_style_en', 'strategy_en' must be in English.
    2. 'genre_translated', 'tone_translated', 'author_style_translated', 'strategy_translated' must be in the UI language (${uiLang}).
    3. 'detected_creativity_level': Calculate a value from 0.1 to 0.7. 
       - If technical/non-fiction/factual: MAX 0.3.
       - If literary/fiction/highly creative: 0.4 to 0.7.
    4. ENSURE NO CENSORSHIP is recommended in the strategy.`;

    try {
      const parts: any[] = [{ text: prompt }];
      if (coverInfo) parts.push({ inlineData: { mimeType: coverInfo.mimeType, data: coverInfo.data } });

      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: { parts },
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              genre_en: { type: Type.STRING },
              tone_en: { type: Type.STRING },
              author_style_en: { type: Type.STRING },
              strategy_en: { type: Type.STRING },
              genre_translated: { type: Type.STRING },
              tone_translated: { type: Type.STRING },
              author_style_translated: { type: Type.STRING },
              strategy_translated: { type: Type.STRING },
              literary_fidelity_note: { type: Type.STRING },
              detected_creativity_level: { type: Type.NUMBER }
            },
            required: ["genre_en", "tone_en", "author_style_en", "strategy_en", "genre_translated", "tone_translated", "author_style_translated", "strategy_translated", "literary_fidelity_note", "detected_creativity_level"]
          }
        }
      });

      if (response.usageMetadata) {
        this.usage.totalTokens += response.usageMetadata.totalTokenCount || 0;
      }

      const strategy = JSON.parse(response.text || '{}');
      this.bookStrategy = strategy;
      this.temperature = strategy.detected_creativity_level || 0.3;
      return strategy;
    } catch {
      return { 
        genre_en: "General Fiction", tone_en: "Neutral", author_style_en: "Standard.", strategy_en: "General translation.",
        genre_translated: "General Fiction", tone_translated: "Neutral", author_style_translated: "Standard.", strategy_translated: "Fidelity.",
        literary_fidelity_note: "Default analysis.", detected_creativity_level: 0.3
      };
    }
  }

  async translateSingle(htmlSnippet: string): Promise<string> {
    if (!htmlSnippet?.trim()) return htmlSnippet;
    const cached = this.getFromCache(htmlSnippet);
    if (cached) { this.lastTranslation = cached; return cached; }

    const result = await this.withRetry(async () => {
      // Initializing with mandatory structure as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: htmlSnippet,
        config: { systemInstruction: this.getSystemInstruction(), temperature: this.temperature }
      });

      if (response.usageMetadata) {
        this.usage.totalTokens += response.usageMetadata.totalTokenCount || 0;
      }

      let translatedText = response.text || "";
      return translatedText.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
    });

    this.saveToCache(htmlSnippet, result);
    this.lastTranslation = result;
    return result;
  }
}
