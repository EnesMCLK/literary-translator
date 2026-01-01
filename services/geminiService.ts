
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
  private cachePrefix = 'lit-v13-';
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
      ? `BAĞLAM VE ÜSLUP:
         - Tür: ${this.bookStrategy.genre_en}
         - Anlatım Tonu: ${this.bookStrategy.tone_en}
         - Yazarın İmzası: ${this.bookStrategy.author_style_en}
         - Strateji: ${this.bookStrategy.strategy_en}`
      : "Profesyonel edebi çeviri.";

    return `SEN: Dünyaca ünlü bir edebi çevirmensin. Görevin, metni ${this.sourceLanguage} dilinden ${this.targetLanguage} diline, yazarın kaleminden çıkmışçasına çevirmektir.

${styleContext}

KURALLAR:
1. **HTML KORUMA:** Metin içindeki <span class="...">, <em>, <strong> gibi tüm HTML etiketlerini ve özniteliklerini olduğu gibi bırak. Sadece metni çevir.
2. **EDEBİ AKIŞ:** Kelimesi kelimesine çeviri yapma. Yazarın üslubunu hedef dilde yeniden yarat. Cümle yapılarını hedef dilin edebi geleneğine uygun şekilde kur.
3. **YALNIZCA ÇEVİRİ:** Açıklama yapma, giriş cümlesi kurma. Sadece çevrilmiş içeriği döndür.
4. **MARKDOWN YASAK:** Çıktıyı \`\`\`html içine alma. Ham metin olarak ver.
5. **DOĞAL DİL:** Akıcılığı bozma. Gerektiğinde deyimleri ve kültürel öğeleri yerelleştir.
6. **SANSÜRSÜZ:** Orijinal metnin duygusuna, sertliğine veya argo kullanımına sadık kal.`;
  }

  async analyzeBook(metadata: any, coverInfo?: { data: string, mimeType: string }, uiLang: UILanguage = 'en'): Promise<BookStrategy> {
    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    
    const prompt = `Analyze this book for translation from ${this.sourceLanguage} to ${this.targetLanguage}:
    Title: ${metadata.title}
    Author: ${metadata.creator}
    Description: ${metadata.description}
    
    Identify the genre, tone, and specific authorial style. Return a JSON style blueprint. Fields ending in _translated must be in ${uiLang}.`;

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
      console.error("Analysis failed", err);
      return { 
        genre_en: "Literature", tone_en: "Narrative", author_style_en: "Fluid", strategy_en: "Fidelity",
        genre_translated: "Edebiyat", tone_translated: "Anlatı", author_style_translated: "Akıcı", strategy_translated: "Sadakat",
        literary_fidelity_note: "Varsayılan strateji.", detected_creativity_level: 0.4
      };
    }
  }

  async translateSingle(htmlSnippet: string): Promise<string> {
    const trimmed = htmlSnippet.trim();
    if (!trimmed || trimmed.length < 1) return htmlSnippet;
    
    const cacheKey = this.cachePrefix + btoa(encodeURIComponent(trimmed)).substring(0, 32);
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
      translated = translated.replace(/^```(html|xhtml|xml)?\n?/i, '').replace(/\n?```$/i, '').trim();

      if (translated && translated !== trimmed) {
        try { localStorage.setItem(cacheKey, translated); } catch (e) {}
      }
      
      return translated || trimmed;
    } catch (error: any) {
      console.error("API Error", error);
      throw error;
    }
  }
}
