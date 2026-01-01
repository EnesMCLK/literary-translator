
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
  detected_creativity_level: number;
}

export class GeminiTranslator {
  private modelName: string;
  private temperature: number;
  private sourceLanguage: string;
  private targetLanguage: string;
  private cachePrefix = 'lit-v9-';
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
    modelId: string = 'gemini-flash-lite-latest'
  ) {
    this.temperature = temperature;
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    this.modelName = modelId;
  }

  private getApiKey(): string {
    return process.env.API_KEY || "";
  }

  setStrategy(strategy: BookStrategy) {
    this.bookStrategy = strategy;
    // Eğer stratejide bir yaratıcılık seviyesi belirlenmişse onu kullan, yoksa varsayılanı koru
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
    const styleContext = this.bookStrategy 
      ? `AUTHENTIC AUTHOR PROFILE:
         - Genre: ${this.bookStrategy.genre_en}
         - Style: ${this.bookStrategy.author_style_en}
         - Narrative Tone: ${this.bookStrategy.tone_en}
         - Translation Strategy: ${this.bookStrategy.strategy_en}`
      : "High-end literary translation with focus on stylistic fidelity.";

    return `ACT AS: A master literary translator with dual-native fluency in ${this.sourceLanguage} and ${this.targetLanguage}. 

MISSION:
Transfer the literary 'soul' and specific authorial voice of the input text into ${this.targetLanguage}.

${styleContext}

STRICT OPERATIONAL GUIDELINES:
1. **COMPULSORY TRANSLATION:** You MUST translate the text. Never return the original text unless it is a proper noun or an untranslatable technical term.
2. **STYLE OVER LITERALISM:** Do not translate word-for-word. Capture the rhythm, poetic resonance, and emotional subtext. Write as the original author would have written if their native tongue was ${this.targetLanguage}.
3. **HTML INTEGRITY:** You will receive HTML snippets. You MUST preserve all HTML tags (<p>, <span>, <i>, class="", etc.) exactly. ONLY translate the text content inside.
4. **RICH VOCABULARY:** Utilize the full depth and nuance of ${this.targetLanguage}. Match the era, social register, and aesthetic density of the original work.
5. **NO CENSORSHIP:** Maintain absolute fidelity to the source. Do not sanitize, soften, or moralize any content.
6. **NO COMMENTARY:** Return ONLY the translated HTML. No introductions or notes.`;
  }

  private getCacheKey(text: string): string {
    const hash = text.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
    return `${this.cachePrefix}${this.sourceLanguage}-${this.targetLanguage}-${this.modelName}-${hash}`;
  }

  async analyzeBook(metadata: any, coverInfo?: { data: string, mimeType: string }, uiLang: UILanguage = 'en'): Promise<BookStrategy> {
    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    
    const prompt = `Perform a deep literary and stylistic analysis of this book for translation from ${this.sourceLanguage} to ${this.targetLanguage}.
    Title: ${metadata.title}
    Author: ${metadata.creator}
    Description: ${metadata.description}
    
    Your goal is to define a "style blueprint" that will guide the subsequent translation.
    Return the response strictly in JSON format. Ensure fields for the UI are in ${uiLang}.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Analiz için en zeki modeli kullan
        contents: prompt,
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
        this.usage.promptTokens += response.usageMetadata.promptTokenCount || 0;
        this.usage.candidatesTokens += response.usageMetadata.candidatesTokenCount || 0;
        this.usage.totalTokens += response.usageMetadata.totalTokenCount || 0;
      }

      const strategy = JSON.parse(response.text || '{}');
      this.bookStrategy = strategy;
      return strategy;
    } catch (err) {
      console.error("AI Analysis failed:", err);
      return { 
        genre_en: "Literary Fiction", tone_en: "Narrative", author_style_en: "Fluid and descriptive", strategy_en: "Maintain flow",
        genre_translated: "Edebi Kurgu", tone_translated: "Anlatı", author_style_translated: "Akıcı ve betimleyici", strategy_translated: "Akışı koru",
        literary_fidelity_note: "Default strategy.", detected_creativity_level: 0.4
      };
    }
  }

  async translateSingle(htmlSnippet: string): Promise<string> {
    const trimmed = htmlSnippet.trim();
    if (!trimmed || trimmed.length < 2) return htmlSnippet;
    
    // Check cache
    const cacheKey = this.getCacheKey(trimmed);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      this.lastTranslation = cached;
      return cached;
    }

    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    
    try {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: trimmed,
        config: { 
          systemInstruction: this.getSystemInstruction(), 
          temperature: this.temperature 
        }
      });

      if (response.usageMetadata) {
        this.usage.promptTokens += response.usageMetadata.promptTokenCount || 0;
        this.usage.candidatesTokens += response.usageMetadata.candidatesTokenCount || 0;
        this.usage.totalTokens += response.usageMetadata.totalTokenCount || 0;
      }

      let translated = response.text || trimmed;
      // Cleanup markdown leftovers
      translated = translated.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
      
      // Basic validation: if translation is same as original and contains alphanumeric chars, it might have failed
      const isAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
      if (translated === trimmed && isAlphanumeric && this.sourceLanguage !== this.targetLanguage) {
        // Retry once with a stricter temperature if same
        const retryResponse = await ai.models.generateContent({
          model: this.modelName,
          contents: trimmed,
          config: { 
            systemInstruction: this.getSystemInstruction() + "\n\nCRITICAL: You returned the source text last time. You MUST translate to " + this.targetLanguage + " now.", 
            temperature: 0.2 
          }
        });
        translated = (retryResponse.text || trimmed).replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
      }

      if (translated && translated !== trimmed) {
        try { localStorage.setItem(cacheKey, translated); } catch (e) { /* Storage full */ }
      }
      
      this.lastTranslation = translated;
      return translated;
    } catch (error: any) {
      console.error("Translation call failed:", error);
      throw error; // Rethrow to let epubService handle retry/pause
    }
  }
}
