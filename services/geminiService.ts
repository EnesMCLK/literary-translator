
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
  private cachePrefix = 'lit-v15-';
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
    if (strategy.detected_creativity_level !== undefined) {
      this.temperature = strategy.detected_creativity_level;
    }
  }

  getUsage(): UsageStats {
    return { ...this.usage };
  }

  private getSystemInstruction(isRepairMode: boolean = false): string {
    const styleContext = this.bookStrategy 
      ? `BOOK CONTEXT:
         - Genre: ${this.bookStrategy.genre_en}
         - Tone: ${this.bookStrategy.tone_en}
         - Style: ${this.bookStrategy.author_style_en}`
      : "Professional literary translation.";

    const repairInstruction = isRepairMode 
      ? `CRITICAL: You previously failed to translate this text or returned it in original language. 
         YOU MUST TRANSLATE THE TEXT INTO ${this.targetLanguage} NOW. NO EXCEPTIONS.` 
      : "";

    return `ACT AS AN EXPERT LITERARY TRANSLATOR. Translate from ${this.sourceLanguage} to ${this.targetLanguage}.

${styleContext}
${repairInstruction}

STRICT TECHNICAL RULES:
1. **HTML TAG PRESERVATION:** The input is an HTML/XHTML inner snippet. Keep ALL tags (like <span class="...">, <em>, <strong>, <a>, <br/>) exactly as they are. ONLY translate the text content between them.
2. **LITERARY FLOW:** Recreate the author's voice. Do not translate literally; adapt idioms and cultural nuances to feel natural in ${this.targetLanguage}.
3. **NO CHATTER:** Return ONLY the translated snippet. No explanations.
4. **COMPLETENESS:** Do not skip any sentences. If the input is long, ensure the output matches its full meaning.`;
  }

  /**
   * Çevirinin doğruluğunu ve eksik kalıp kalmadığını kontrol eder.
   */
  private isTranslationSuspicious(original: string, translated: string): boolean {
    const cleanOrig = original.replace(/<[^>]*>/g, '').trim();
    const cleanTrans = translated.replace(/<[^>]*>/g, '').trim();
    
    if (!cleanTrans) return true; // Boş döndüyse
    if (cleanOrig.length > 10 && cleanOrig === cleanTrans) return true; // Hiç değişmediyse (ve kısa bir etiket değilse)
    
    // Basit dil algılama: Hedef Türkçe ise ve sık kullanılan İngilizce kelimeler hala duruyorsa
    if (this.targetLanguage.toLowerCase().includes('turkish')) {
        const englishMarkers = [' the ', ' and ', ' with ', ' that ', ' which '];
        const foundMarkers = englishMarkers.filter(m => cleanTrans.toLowerCase().includes(m));
        if (foundMarkers.length > 2 && cleanOrig.length > 50) return true;
    }

    return false;
  }

  async analyzeBook(metadata: any, coverInfo?: { data: string, mimeType: string }, uiLang: UILanguage = 'en'): Promise<BookStrategy> {
    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    
    const prompt = `Perform a deep literary and structural analysis of this book for translation from ${this.sourceLanguage} to ${this.targetLanguage}.
    
    METADATA:
    Title: ${metadata.title}
    Author: ${metadata.creator}
    Description: ${metadata.description}
    
    Return a JSON blueprint. All translated fields must be in the interface language: ${uiLang}.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
          tools: [{googleSearch: {}}],
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

      return JSON.parse(response.text || '{}');
    } catch (err) {
      return { 
        genre_en: "Literature", tone_en: "Narrative", author_style_en: "Fluid", strategy_en: "Fidelity",
        genre_translated: uiLang === 'tr' ? "Edebiyat" : "Literature", 
        tone_translated: uiLang === 'tr' ? "Anlatı" : "Narrative", 
        author_style_translated: uiLang === 'tr' ? "Akıcı" : "Fluid", 
        strategy_translated: uiLang === 'tr' ? "Sadakat" : "Fidelity",
        literary_fidelity_note: "Default fallback strategy used.", detected_creativity_level: 0.4
      };
    }
  }

  async translateSingle(htmlSnippet: string, isRetry: boolean = false): Promise<string> {
    const trimmed = htmlSnippet.trim();
    if (!trimmed) return htmlSnippet;
    
    const cacheKey = this.cachePrefix + btoa(encodeURIComponent(trimmed)).substring(0, 32) + (isRetry ? '_repair' : '');
    if (!isRetry) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return cached;
    }

    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    
    try {
      const response = await ai.models.generateContent({
        model: this.modelName,
        contents: trimmed,
        config: { 
          systemInstruction: this.getSystemInstruction(isRetry), 
          temperature: isRetry ? 0.1 : this.temperature // Onarım modunda daha deterministik
        }
      });

      if (response.usageMetadata) {
        this.usage.promptTokens += response.usageMetadata.promptTokenCount || 0;
        this.usage.candidatesTokens += response.usageMetadata.candidatesTokenCount || 0;
        this.usage.totalTokens += response.usageMetadata.totalTokenCount || 0;
      }

      let translated = (response.text || "").trim();
      translated = translated.replace(/^```(html|xhtml|xml)?\n?/i, '').replace(/\n?```$/i, '').trim();

      // Doğrulama mekanizması
      if (!isRetry && this.isTranslationSuspicious(trimmed, translated)) {
          throw new Error("TRANSLATION_SKIPPED_OR_INVALID");
      }

      if (translated && translated !== trimmed) {
        try { localStorage.setItem(cacheKey, translated); } catch (e) {}
      }
      
      return translated || trimmed;
    } catch (error: any) {
      throw error;
    }
  }
}
