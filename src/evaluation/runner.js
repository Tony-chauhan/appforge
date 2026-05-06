// Evaluation Runner - Runs prompts through pipeline and collects metrics
import { PipelineOrchestrator } from '../pipeline/orchestrator.js';
import { RuntimeSimulator } from '../runtime/simulator.js';
import { realPrompts, edgeCasePrompts } from './dataset.js';
import dotenv from 'dotenv';
dotenv.config();

class EvaluationRunner {
  constructor(config = {}) {
    this.pipeline = new PipelineOrchestrator({
      provider: config.provider || process.env.LLM_PROVIDER || 'gemini',
      apiKey: config.apiKey || process.env.GEMINI_API_KEY,
    });
    this.results = [];
  }

  async runAll(prompts = null) {
    const dataset = prompts || [...realPrompts, ...edgeCasePrompts];
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  AppForge Evaluation Suite — ${dataset.length} prompts`);
    console.log(`${'═'.repeat(60)}\n`);

    for (const testCase of dataset) {
      console.log(`[${testCase.id}] ${testCase.name}...`);
      const result = await this.runSingle(testCase);
      this.results.push(result);
      console.log(`  ${result.success ? '✓' : '✗'} ${result.latency}ms | retries: ${result.retries} | tokens: ${result.tokens}`);
      // Add delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
    }

    return this.summarize();
  }

  async runSingle(testCase) {
    const start = Date.now();
    try {
      const result = await this.pipeline.run(testCase.prompt);
      const latency = Date.now() - start;

      // Check quality
      const quality = this.assessQuality(result, testCase);

      // Test runtime
      let runtimeOk = false;
      if (result.success && result.output) {
        const runtime = RuntimeSimulator.generate(result.output);
        runtimeOk = runtime.success;
      }

      return {
        id: testCase.id,
        name: testCase.name,
        type: testCase.type || 'real',
        success: result.success,
        latency,
        retries: result.metrics?.totalRetries || 0,
        tokens: result.metrics?.totalTokens || 0,
        repairs: result.metrics?.totalRepairs || 0,
        runtimeExecutable: runtimeOk,
        quality,
        validationPassed: result.validation?.allValid || false,
        error: result.error || null,
      };
    } catch (err) {
      return {
        id: testCase.id,
        name: testCase.name,
        type: testCase.type || 'real',
        success: false,
        latency: Date.now() - start,
        retries: 0,
        tokens: 0,
        repairs: 0,
        runtimeExecutable: false,
        quality: { score: 0 },
        validationPassed: false,
        error: err.message,
      };
    }
  }

  assessQuality(result, testCase) {
    if (!result.success) return { score: 0, details: 'Pipeline failed' };
    let score = 0;
    const details = [];

    // Valid JSON output
    if (result.output) { score += 20; details.push('+20: Valid output'); }

    // Has all layers
    const layers = ['ui', 'api', 'db', 'auth', 'businessLogic'];
    const present = layers.filter(l => result.output?.[l]);
    score += (present.length / layers.length) * 20;
    details.push(`+${((present.length / layers.length) * 20).toFixed(0)}: ${present.length}/${layers.length} layers`);

    // Validation passed
    if (result.validation?.allValid) { score += 20; details.push('+20: Validation passed'); }

    // Entity coverage (for real prompts)
    if (testCase.expectedEntities) {
      const entities = result.output?.db?.tables?.map(t => t.name.toLowerCase()) || [];
      const found = testCase.expectedEntities.filter(e =>
        entities.some(t => t.includes(e.toLowerCase()) || e.toLowerCase().includes(t.replace(/s$/, '')))
      );
      const entityScore = (found.length / testCase.expectedEntities.length) * 20;
      score += entityScore;
      details.push(`+${entityScore.toFixed(0)}: ${found.length}/${testCase.expectedEntities.length} entities`);
    } else {
      score += 10; // Edge cases get partial credit for completing
      details.push('+10: Edge case handled');
    }

    // Cross-layer consistency
    const crossIssues = result.validation?.crossLayer?.issues?.length || 0;
    if (crossIssues === 0) { score += 20; details.push('+20: Cross-layer consistent'); }
    else { score += Math.max(0, 20 - crossIssues * 5); }

    return { score: Math.min(100, Math.round(score)), details };
  }

  summarize() {
    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const runtimeOk = this.results.filter(r => r.runtimeExecutable).length;
    const avgLatency = this.results.reduce((s, r) => s + r.latency, 0) / total;
    const avgTokens = this.results.reduce((s, r) => s + r.tokens, 0) / total;
    const avgRetries = this.results.reduce((s, r) => s + r.retries, 0) / total;
    const avgQuality = this.results.reduce((s, r) => s + r.quality.score, 0) / total;
    const totalRepairs = this.results.reduce((s, r) => s + r.repairs, 0);

    const real = this.results.filter(r => r.type === 'real');
    const edge = this.results.filter(r => r.type !== 'real');

    const summary = {
      overview: {
        total, successful, successRate: `${((successful / total) * 100).toFixed(1)}%`,
        runtimeExecutable: runtimeOk, runtimeRate: `${((runtimeOk / total) * 100).toFixed(1)}%`,
      },
      performance: {
        avgLatency: `${(avgLatency / 1000).toFixed(1)}s`,
        avgTokens: Math.round(avgTokens),
        avgRetries: avgRetries.toFixed(1),
        totalRepairs,
      },
      quality: {
        avgScore: `${avgQuality.toFixed(1)}/100`,
        realPromptAvg: `${(real.reduce((s, r) => s + r.quality.score, 0) / (real.length || 1)).toFixed(1)}/100`,
        edgeCaseAvg: `${(edge.reduce((s, r) => s + r.quality.score, 0) / (edge.length || 1)).toFixed(1)}/100`,
      },
      failureTypes: this.results.filter(r => !r.success).map(r => ({ id: r.id, error: r.error })),
      individualResults: this.results,
    };

    console.log(`\n${'═'.repeat(60)}`);
    console.log('  EVALUATION SUMMARY');
    console.log(`${'═'.repeat(60)}`);
    console.log(`  Success Rate:      ${summary.overview.successRate} (${successful}/${total})`);
    console.log(`  Runtime Exec Rate: ${summary.overview.runtimeRate}`);
    console.log(`  Avg Quality Score: ${summary.quality.avgScore}`);
    console.log(`  Avg Latency:       ${summary.performance.avgLatency}`);
    console.log(`  Avg Retries:       ${summary.performance.avgRetries}`);
    console.log(`  Total Repairs:     ${summary.performance.totalRepairs}`);
    console.log(`${'═'.repeat(60)}\n`);

    return summary;
  }
}

// Run evaluation if executed directly
const isMain = process.argv[1]?.endsWith('runner.js');
if (isMain) {
  const runner = new EvaluationRunner();
  runner.runAll().then(summary => {
    console.log(JSON.stringify(summary, null, 2));
  }).catch(err => {
    console.error('Evaluation failed:', err);
    process.exit(1);
  });
}

export { EvaluationRunner };
