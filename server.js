// AppForge Server - Express API + Static Frontend
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PipelineOrchestrator } from './src/pipeline/orchestrator.js';
import { RuntimeSimulator } from './src/runtime/simulator.js';
import { EvaluationRunner } from './src/evaluation/runner.js';
import { allPrompts } from './src/evaluation/dataset.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(join(__dirname, 'public')));

// Store active pipelines for SSE streaming
const activePipelines = new Map();

// ════════════════════════════════════════════════════════════
// API Routes
// ════════════════════════════════════════════════════════════

// POST /api/generate - Run the full pipeline
app.post('/api/generate', async (req, res) => {
  const { prompt, apiKey, provider, model } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    return res.status(400).json({ error: 'API key is required. Set GEMINI_API_KEY in .env or provide in request.' });
  }

  const pipeline = new PipelineOrchestrator({
    provider: provider || process.env.LLM_PROVIDER || 'gemini',
    apiKey: key,
    model: model || 'gemini-2.0-flash',
  });

  try {
    const progressEvents = [];
    const result = await pipeline.run(prompt, (event) => {
      progressEvents.push(event);
    });

    // Generate runtime artifacts if successful
    let runtime = null;
    if (result.success && result.output) {
      const configs = {
        ui: result.output.ui,
        api: result.output.api,
        db: result.output.db,
        auth: result.output.auth,
        businessLogic: result.output.businessLogic,
      };
      runtime = RuntimeSimulator.generate(configs);
    }

    res.json({
      ...result,
      runtime,
      progressEvents,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/generate/stream - SSE streaming pipeline
app.post('/api/generate/stream', async (req, res) => {
  const { prompt, apiKey, provider, model } = req.body;

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    return res.status(400).json({ error: 'API key is required' });
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const pipeline = new PipelineOrchestrator({
    provider: provider || process.env.LLM_PROVIDER || 'gemini',
    apiKey: key,
    model: model || 'gemini-2.0-flash',
  });

  try {
    const result = await pipeline.run(prompt, (event) => {
      sendEvent({ type: 'progress', ...event });
    });

    // Generate runtime artifacts
    let runtime = null;
    if (result.success && result.output) {
      runtime = RuntimeSimulator.generate({
        ui: result.output.ui,
        api: result.output.api,
        db: result.output.db,
        auth: result.output.auth,
        businessLogic: result.output.businessLogic,
      });
    }

    sendEvent({ type: 'complete', result: { ...result, runtime } });
  } catch (error) {
    sendEvent({ type: 'error', error: error.message });
  }

  res.end();
});

// GET /api/eval/dataset - Get evaluation dataset
app.get('/api/eval/dataset', (req, res) => {
  res.json(allPrompts);
});

// POST /api/eval/run - Run evaluation on a subset
app.post('/api/eval/run', async (req, res) => {
  const { promptIds, apiKey } = req.body;
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key) return res.status(400).json({ error: 'API key required' });

  const runner = new EvaluationRunner({ apiKey: key });
  const prompts = promptIds
    ? allPrompts.filter(p => promptIds.includes(p.id))
    : allPrompts.slice(0, 3); // Default: first 3 for demo

  try {
    const summary = await runner.runAll(prompts);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    provider: process.env.LLM_PROVIDER || 'gemini',
    hasApiKey: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'),
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ⚡ AppForge Server`);
  console.log(`  📡 http://localhost:${PORT}`);
  console.log(`  🔑 API Key: ${process.env.GEMINI_API_KEY ? '✓ Configured' : '✗ Not set'}`);
  console.log(`${'═'.repeat(50)}\n`);
});
