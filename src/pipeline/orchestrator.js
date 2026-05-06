// Pipeline Orchestrator - Coordinates multi-stage generation
// Acts like a compiler: parse → analyze → generate → validate → emit
import { v4 as uuid } from 'uuid';
import { LLMProvider } from '../llm/provider.js';
import { SchemaValidator, CrossLayerValidator } from '../validation/validator.js';
import {
  INTENT_SYSTEM_PROMPT, DESIGN_SYSTEM_PROMPT,
  SCHEMA_SYSTEM_PROMPT, REFINEMENT_SYSTEM_PROMPT,
  buildIntentPrompt, buildDesignPrompt,
  buildSchemaPrompt, buildRefinementPrompt
} from '../prompts/index.js';

const STAGE_NAMES = ['intent', 'design', 'schema', 'refinement', 'validation'];

export class PipelineOrchestrator {
  constructor(config = {}) {
    this.llm = new LLMProvider({
      provider: config.provider || 'gemini',
      apiKey: config.apiKey,
      model: config.model || 'gemini-2.0-flash',
      temperature: 0.1,
    });
    this.maxRepairAttempts = config.maxRepairAttempts || 3;
  }

  // Main entry point - runs full pipeline
  async run(userPrompt, onProgress) {
    const runId = uuid();
    const metrics = {
      runId,
      startTime: Date.now(),
      stages: {},
      totalRetries: 0,
      totalTokens: 0,
      errors: [],
      repairs: [],
    };

    const emit = (stage, status, data = {}) => {
      if (onProgress) onProgress({ stage, status, ...data, timestamp: Date.now() });
    };

    try {
      // ═══════════════════════════════════════════
      // STAGE 1: Intent Extraction
      // ═══════════════════════════════════════════
      emit('intent', 'running');
      const intentResult = await this._runStageWithValidation(
        'intent', INTENT_SYSTEM_PROMPT, buildIntentPrompt(userPrompt), metrics
      );
      emit('intent', 'complete', { data: intentResult.data });

      // ═══════════════════════════════════════════
      // STAGE 2: System Design
      // ═══════════════════════════════════════════
      emit('design', 'running');
      const designResult = await this._runStageWithValidation(
        'design', DESIGN_SYSTEM_PROMPT, buildDesignPrompt(intentResult.data), metrics
      );
      emit('design', 'complete', { data: designResult.data });

      // ═══════════════════════════════════════════
      // STAGE 3: Schema Generation
      // ═══════════════════════════════════════════
      emit('schema', 'running');
      const schemaResult = await this._runSchemaGeneration(designResult.data, metrics);
      emit('schema', 'complete', { data: schemaResult });

      // ═══════════════════════════════════════════
      // STAGE 4: Refinement (Cross-Layer Validation + Repair)
      // ═══════════════════════════════════════════
      emit('refinement', 'running');
      const refined = await this._runRefinement(schemaResult, metrics);
      emit('refinement', 'complete', { data: refined });

      // ═══════════════════════════════════════════
      // STAGE 5: Final Validation
      // ═══════════════════════════════════════════
      emit('validation', 'running');
      const validated = this._finalValidation(refined, metrics);
      emit('validation', 'complete', { data: validated });

      // Compile final output
      metrics.endTime = Date.now();
      metrics.totalLatency = metrics.endTime - metrics.startTime;

      return {
        success: true,
        runId,
        input: userPrompt,
        output: {
          intent: intentResult.data,
          design: designResult.data,
          ...refined
        },
        validation: validated,
        metrics: this._summarizeMetrics(metrics)
      };

    } catch (error) {
      metrics.endTime = Date.now();
      metrics.totalLatency = metrics.endTime - metrics.startTime;
      emit('error', 'failed', { error: error.message });

      return {
        success: false,
        runId,
        input: userPrompt,
        error: error.message,
        metrics: this._summarizeMetrics(metrics)
      };
    }
  }

  // Run a stage with validation and auto-repair
  async _runStageWithValidation(stageName, systemPrompt, userPrompt, metrics) {
    const stageStart = Date.now();
    let retries = 0;
    let lastErrors = [];

    for (let attempt = 0; attempt <= this.maxRepairAttempts; attempt++) {
      try {
        // Generate
        const llmResult = await this.llm.generate(systemPrompt, userPrompt);
        metrics.totalTokens += llmResult.usage?.totalTokens || 0;

        // Parse JSON
        const parsed = LLMProvider.extractJSON(llmResult.content);

        // Validate
        const validation = SchemaValidator.validateAndRepair(stageName, parsed);

        if (validation.valid) {
          metrics.stages[stageName] = {
            latency: Date.now() - stageStart,
            retries,
            tokens: llmResult.usage?.totalTokens || 0,
            repairs: validation.repairs.length,
          };
          metrics.repairs.push(...validation.repairs.map(r => ({ stage: stageName, ...r })));
          return { data: validation.data, validation };
        }

        // If not valid after repair, retry with error context
        lastErrors = validation.errors;
        retries++;
        metrics.totalRetries++;

        // Enhance prompt with error feedback for retry
        userPrompt = `${userPrompt}\n\nPREVIOUS ATTEMPT HAD ERRORS. Fix these issues:\n${JSON.stringify(lastErrors, null, 2)}\n\nGenerate corrected output:`;

      } catch (err) {
        retries++;
        metrics.totalRetries++;
        lastErrors = [{ message: err.message }];
        if (attempt === this.maxRepairAttempts) throw err;
      }
    }

    throw new Error(`Stage "${stageName}" failed after ${retries} retries. Errors: ${JSON.stringify(lastErrors)}`);
  }

  // Schema generation produces all config layers
  async _runSchemaGeneration(design, metrics) {
    const stageStart = Date.now();

    const llmResult = await this.llm.generate(
      SCHEMA_SYSTEM_PROMPT,
      buildSchemaPrompt(design),
      { maxTokens: 16384 }
    );
    metrics.totalTokens += llmResult.usage?.totalTokens || 0;

    const parsed = LLMProvider.extractJSON(llmResult.content);

    // Validate each sub-schema
    const layers = ['ui', 'api', 'db', 'auth', 'businessLogic'];
    const results = {};
    const allRepairs = [];

    for (const layer of layers) {
      if (!parsed[layer]) {
        // Missing layer - add default
        parsed[layer] = this._getDefaultLayer(layer);
        allRepairs.push({ description: `Added missing layer: ${layer}` });
      }

      const schemaName = layer === 'businessLogic' ? 'businessLogic' : layer;
      const validation = SchemaValidator.validateAndRepair(schemaName, parsed[layer]);
      results[layer] = validation.data;
      allRepairs.push(...validation.repairs);
    }

    metrics.stages.schema = {
      latency: Date.now() - stageStart,
      tokens: llmResult.usage?.totalTokens || 0,
      repairs: allRepairs.length,
    };
    metrics.repairs.push(...allRepairs.map(r => ({ stage: 'schema', ...r })));

    return results;
  }

  // Refinement: cross-layer validation + LLM-assisted repair
  async _runRefinement(schemas, metrics) {
    const stageStart = Date.now();

    // Cross-layer validation
    const crossValidation = CrossLayerValidator.validate(schemas);

    if (crossValidation.consistent) {
      metrics.stages.refinement = { latency: Date.now() - stageStart, issues: 0 };
      return schemas;
    }

    // Auto-fix what we can
    const { configs: autoFixed, repairs: autoRepairs } = CrossLayerValidator.autoFix(schemas, crossValidation.issues);
    metrics.repairs.push(...autoRepairs.map(r => ({ stage: 'refinement', description: r })));

    // Re-check after auto-fix
    const recheck = CrossLayerValidator.validate(autoFixed);
    if (recheck.consistent) {
      metrics.stages.refinement = {
        latency: Date.now() - stageStart,
        issues: crossValidation.issues.length,
        autoFixed: autoRepairs.length
      };
      return autoFixed;
    }

    // LLM-assisted repair for remaining issues
    try {
      const llmResult = await this.llm.generate(
        REFINEMENT_SYSTEM_PROMPT,
        buildRefinementPrompt(autoFixed, recheck.issues),
        { maxTokens: 16384 }
      );
      metrics.totalTokens += llmResult.usage?.totalTokens || 0;

      const refinedParsed = LLMProvider.extractJSON(llmResult.content);

      // Merge refined schemas
      const merged = { ...autoFixed };
      for (const layer of ['ui', 'api', 'db', 'auth', 'businessLogic']) {
        if (refinedParsed[layer]) {
          const validation = SchemaValidator.validateAndRepair(
            layer === 'businessLogic' ? 'businessLogic' : layer,
            refinedParsed[layer]
          );
          if (validation.valid) {
            merged[layer] = validation.data;
          }
        }
      }

      metrics.stages.refinement = {
        latency: Date.now() - stageStart,
        issues: crossValidation.issues.length,
        autoFixed: autoRepairs.length,
        llmFixed: true
      };

      return merged;
    } catch {
      // If LLM repair fails, return auto-fixed version
      metrics.stages.refinement = {
        latency: Date.now() - stageStart,
        issues: crossValidation.issues.length,
        autoFixed: autoRepairs.length,
        llmFixed: false
      };
      return autoFixed;
    }
  }

  // Final validation pass
  _finalValidation(schemas, metrics) {
    const stageStart = Date.now();
    const results = {};

    for (const [layer, data] of Object.entries(schemas)) {
      const schemaName = layer === 'businessLogic' ? 'businessLogic' : layer;
      results[layer] = SchemaValidator.validate(schemaName, data);
    }

    const crossLayer = CrossLayerValidator.validate(schemas);

    metrics.stages.validation = { latency: Date.now() - stageStart };

    return {
      layers: results,
      crossLayer,
      allValid: Object.values(results).every(r => r.valid) && crossLayer.consistent
    };
  }

  _getDefaultLayer(layer) {
    const defaults = {
      ui: { pages: [], navigation: { type: 'sidebar', items: [] }, theme: { primaryColor: '#3B82F6', mode: 'light' } },
      api: { baseUrl: '/api/v1', endpoints: [] },
      db: { dialect: 'postgresql', tables: [] },
      auth: { strategy: 'jwt', roles: [{ name: 'user', isDefault: true }], permissions: [], rules: [] },
      businessLogic: { rules: [], computedFields: [] }
    };
    return defaults[layer] || {};
  }

  _summarizeMetrics(metrics) {
    return {
      runId: metrics.runId,
      totalLatency: metrics.totalLatency,
      totalRetries: metrics.totalRetries,
      totalTokens: metrics.totalTokens,
      totalRepairs: metrics.repairs.length,
      stages: metrics.stages,
      repairs: metrics.repairs.map(r => r.description || JSON.stringify(r)),
    };
  }
}
