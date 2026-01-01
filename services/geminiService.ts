
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
  private cachePrefix = 'lit-v14-';
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

  private getSystemInstruction(): string {
    const styleContext = this.bookStrategy 
      ? `BOOK CONTEXT:
         - Genre: ${this.bookStrategy.genre_en}
         - Tone: ${this.bookStrategy.tone_en}
         - Style: ${this.bookStrategy.author_style_en}
         - Strategy: ${this.bookStrategy.strategy_en}`
      : "Professional literary translation.";

    return `ACT AS AN EXPERT LITERARY TRANSLATOR. Translate from ${this.sourceLanguage} to ${this.targetLanguage}.

${styleContext}

STRICT TECHNICAL RULES:
1. **HTML TAG PRESERVATION:** The input is an HTML/XHTML inner snippet. Keep ALL tags (like <span class="...">, <em>, <strong>, <a>, <br/>) exactly as they are. ONLY translate the text content between them.
2. **NO MARKDOWN:** Do NOT wrap the output in code blocks like \`\`\`html or \`\`\`. Provide raw string output.
3. **LITERARY FLOW:** Recreate the author's voice. Do not translate literally; adapt idioms and cultural nuances to feel natural in ${this.targetLanguage}.
4. **NO CHATTER:** Return ONLY the translated snippet. No explanations.
5. **TAG STRUCTURE:** Ensure every opening tag has its closing tag in the same order as the source. Do NOT add new tags.`;
  }

  async analyzeBook(metadata: any, coverInfo?: { data: string, mimeType: string }, uiLang: UILanguage = 'en'): Promise<BookStrategy> {
    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    
    const prompt = `Perform a deep literary and structural analysis of this book for translation from ${this.sourceLanguage} to ${this.targetLanguage}:
    Title: ${metadata.title}
    Author: ${metadata.creator}
    Description: ${metadata.description}
    
    GUIDELINES FOR creativity_level (0.0 to 1.0):
    - 0.1 to 0.2: Technical, academic, non-fiction where precision is paramount.
    - 0.3 to 0.4: Classical literature, historical accounts, formal prose.
    - 0.5 to 0.6: Modern fiction, sci-fi, crime thrillers where flow and emotion are key.
    - 0.7 to 0.8: Poetry, surrealist literature, children's books requiring heavy localization.
    
    Identify genre, tone, and authorial style. Return a JSON blueprint. All translated fields must be in language: ${uiLang}.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
              detected_creativity_level: { type: Type.NUMBER, description: "Suggested temperature value for this book's genre/style." }
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
      console.error("Analysis fail", err);
      return { 
        genre_en: "Literature", tone_en: "Narrative", author_style_en: "Fluid", strategy_en: "Fidelity",
        genre_translated: "Edebiyat", tone_translated: "Anlatı", author_style_translated: "Akıcı", strategy_translated: "Sadakat",
        literary_fidelity_note: "Default strategy.", detected_creativity_level: 0.4
      };
    }
  }

  async translateSingle(htmlSnippet: string): Promise<string> {
    const trimmed = htmlSnippet.trim();
    if (!trimmed) return htmlSnippet;
    
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
      console.error("Translate API Error", error);
      throw error;
    }
  }
}
