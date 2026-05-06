// LLM Provider Abstraction Layer
// Supports Gemini and OpenAI with structured JSON output
import { GoogleGenerativeAI } from '@google/generative-ai';

export class LLMProvider {
  constructor(config = {}) {
    this.provider = config.provider || 'gemini';
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-2.0-flash';
    this.temperature = config.temperature ?? 0.1; // Low temp for determinism
    this.maxRetries = config.maxRetries || 2;
    this._client = null;
  }

  _getClient() {
    if (this._client) return this._client;
    if (this.provider === 'gemini') {
      this._client = new GoogleGenerativeAI(this.apiKey);
    }
    return this._client;
  }

  async generate(systemPrompt, userPrompt, options = {}) {
    const startTime = Date.now();
    let lastError = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this._callLLM(systemPrompt, userPrompt, options);
        const latency = Date.now() - startTime;
        return {
          content: result.text,
          usage: result.usage,
          latency,
          attempts: attempt + 1,
          provider: this.provider,
          model: this.model
        };
      } catch (err) {
        lastError = err;
        console.error(`[LLM] Attempt ${attempt + 1} failed:`, err.message);
        if (attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    throw new Error(`LLM generation failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`);
  }

  async _callLLM(systemPrompt, userPrompt, options) {
    if (this.provider === 'gemini') {
      return this._callGemini(systemPrompt, userPrompt, options);
    }
    throw new Error(`Unsupported provider: ${this.provider}`);
  }

  async _callGemini(systemPrompt, userPrompt, options) {
    const client = this._getClient();
    const model = client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: options.temperature ?? this.temperature,
        responseMimeType: 'application/json',
        maxOutputTokens: options.maxTokens || 8192,
      },
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userPrompt);
    const response = result.response;
    const text = response.text();
    const usage = response.usageMetadata || {};

    return {
      text,
      usage: {
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0
      }
    };
  }

  // Extract JSON from LLM response, handling markdown fences
  static extractJSON(text) {
    if (!text) throw new Error('Empty LLM response');
    let cleaned = text.trim();
    // Remove markdown JSON fences
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) cleaned = fenceMatch[1].trim();
    // Try parsing directly
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Attempt recovery: find first { or [
      const startObj = cleaned.indexOf('{');
      const startArr = cleaned.indexOf('[');
      let start = -1;
      if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr);
      else if (startObj >= 0) start = startObj;
      else if (startArr >= 0) start = startArr;

      if (start >= 0) {
        const sub = cleaned.substring(start);
        try { return JSON.parse(sub); } catch (_) {}
        // Try fixing common issues: trailing commas, unquoted keys
        const fixed = sub
          .replace(/,\s*([\]}])/g, '$1')
          .replace(/(['"])?([a-zA-Z_]\w*)\1\s*:/g, '"$2":');
        try { return JSON.parse(fixed); } catch (_) {}
      }
      throw new Error(`Failed to parse JSON from LLM response: ${e.message}\nRaw: ${cleaned.substring(0, 200)}...`);
    }
  }
}
