
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
  private cachePrefix = 'lit-v12-'; // Sürüm güncellemesi
  private bookStrategy: BookStrategy | null = null;
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
    return (window as any).manualApiKey || process.env.API_KEY || "";
  }

  setStrategy(strategy: BookStrategy) {
    this.bookStrategy = strategy;
    if (strategy.detected_creativity_level) {
      this.temperature = Math.min(1.0, strategy.detected_creativity_level);
    }
  }

  getUsage(): UsageStats {
    return { ...this.usage };
  }

  private getSystemInstruction(): string {
    const styleContext = this.bookStrategy 
      ? `LITERARY CONTEXT:
         - Genre: ${this.bookStrategy.genre_en}
         - Tone: ${this.bookStrategy.tone_en}
         - Author Style: ${this.bookStrategy.author_style_en}
         - Strategy: ${this.bookStrategy.strategy_en}`
      : "Professional high-quality literary translation.";

    return `ACT AS: A world-class literary translator and stylistic analyst specialized in ${this.sourceLanguage} to ${this.targetLanguage} translation.

${styleContext}

STRICT RULES FOR OUTPUT:
1. **HTML PRESERVATION:** I will provide HTML snippets. You MUST preserve all HTML tags (e.g., <span>, <em>, <strong>, <a>) and their attributes EXACTLY as they appear. Translate only the text content within the tags.
2. **LITERARY FIDELITY:** Do not translate word-for-word. Translate the "voice" of the author. If a sentence uses a complex metaphor, recreate that metaphor with equivalent literary weight in ${this.targetLanguage}.
3. **RAW CONTENT ONLY:** Do not include any explanations, introductions, or "Here is your translation" notes. Return only the translated HTML.
4. **NO MARKDOWN:** Do not wrap your response in markdown code blocks like \`\`\`html. Return the raw string content.
5. **UNFILTERED:** Preserve any vulgarity, intensity, or stylistic complexity present in the source. Do not simplify the text.
6. **NON-EMPTY:** Always provide a translation unless the text is purely numerical or untranslatable names.`;
  }

  async analyzeBook(metadata: any, coverInfo?: { data: string, mimeType: string }, uiLang: UILanguage = 'en'): Promise<BookStrategy> {
    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    
    const prompt = `Deeply analyze this book for a professional translation project from ${this.sourceLanguage} to ${this.targetLanguage}.
    Title: ${metadata.title}
    Author: ${metadata.creator}
    Description: ${metadata.description}
    
    Identify the literary genre, the psychological tone, and the author's stylistic signature. Return the result in strict JSON format. Fields ending in _translated must be in ${uiLang}.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
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
        genre_en: "Literary Fiction", tone_en: "Narrative", author_style_en: "Classic", strategy_en: "Maintain flow",
        genre_translated: "Edebi Kurgu", tone_translated: "Anlatı", author_style_translated: "Klasik", strategy_translated: "Akışı koru",
        literary_fidelity_note: "Default strategy applied.", detected_creativity_level: 0.3
      };
    }
  }

  async translateSingle(htmlSnippet: string): Promise<string> {
    const trimmed = htmlSnippet.trim();
    if (!trimmed || trimmed.length < 1) return htmlSnippet;
    
    // Güvenli önbellek anahtarı
    const safeBase64 = btoa(encodeURIComponent(trimmed)).substring(0, 32);
    const cacheKey = this.cachePrefix + safeBase64;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

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

      let translated = (response.text || "").trim();
      
      // Markdown kalıntılarını ve gereksiz boşlukları temizle
      translated = translated.replace(/^```(html|xhtml|xml)?\n?/i, '')
                           .replace(/\n?```$/i, '')
                           .trim();

      if (translated && translated !== trimmed) {
        try { localStorage.setItem(cacheKey, translated); } catch (e) {}
      }
      
      return translated || trimmed;
    } catch (error: any) {
      console.error("Translation API call failed:", error);
      throw error;
    }
  }
}
