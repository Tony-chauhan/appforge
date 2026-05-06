# AppForge — Natural Language Application Compiler

> A multi-stage AI pipeline that compiles natural language descriptions into validated, executable application configurations.

## 🏗️ Architecture

AppForge operates like a traditional compiler with distinct stages:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   STAGE 1    │────▶│   STAGE 2    │────▶│   STAGE 3    │────▶│   STAGE 4    │────▶│   STAGE 5    │
│   Intent     │     │   System     │     │   Schema     │     │  Refinement  │     │  Validation  │
│  Extraction  │     │   Design     │     │  Generation  │     │   & Repair   │     │  & Runtime   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
     ▲                                                               │
     │                         Repair Loop                           │
     └───────────────────────────────────────────────────────────────┘
```

### Pipeline Stages

| Stage | Input | Output | Validation |
|-------|-------|--------|------------|
| 1. Intent Extraction | Natural language | Structured intent (features, entities, roles) | JSON Schema |
| 2. System Design | Intent JSON | Architecture + entity model + pages | JSON Schema |
| 3. Schema Generation | Design JSON | UI + API + DB + Auth + Logic configs | Per-layer JSON Schema |
| 4. Refinement | All schemas | Cross-layer validated configs | Cross-layer consistency |
| 5. Validation | Refined schemas | Final validation report + runtime artifacts | Full pipeline check |

### Key Design Decisions

1. **Multi-stage pipeline** (not single prompt): Each stage has a focused responsibility, reducing hallucination and improving reliability
2. **JSON Schema enforcement**: Every output is validated against formal schemas using AJV
3. **Auto-repair engine**: Handles 7+ error types (missing fields, type mismatches, enum violations, pattern issues)
4. **Cross-layer validation**: Ensures API endpoints match DB tables, UI components reference valid APIs, roles are consistent
5. **Low temperature (0.1)**: Prioritizes deterministic outputs over creativity
6. **Structured prompting**: Each stage has a precise system prompt with output format specification

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Google Gemini API key ([get one here](https://aistudio.google.com/apikey))

### Setup

```bash
# Clone and install
git clone <repo-url>
cd appforge
npm install

# Configure
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run
npm start
# Open http://localhost:3000
```

### Usage

1. Open http://localhost:3000
2. Enter your API key in Settings (⚙️)
3. Type or load a preset prompt
4. Click "⚡ Compile Application"
5. View generated configs in each tab
6. Check Runtime tab for executable code

## 📁 Project Structure

```
appforge/
├── server.js                    # Express server + API routes
├── src/
│   ├── llm/
│   │   └── provider.js          # LLM abstraction (Gemini support)
│   ├── pipeline/
│   │   └── orchestrator.js      # Multi-stage pipeline coordinator
│   ├── prompts/
│   │   └── index.js             # Structured prompts for each stage
│   ├── schemas/
│   │   └── definitions.js       # JSON Schema definitions (7 schemas)
│   ├── validation/
│   │   └── validator.js         # Schema validator + repair engine + cross-layer checker
│   ├── runtime/
│   │   └── simulator.js         # Code generator (SQL, Express, React, Auth)
│   └── evaluation/
│       ├── dataset.js           # 20 test prompts (10 real + 10 edge cases)
│       └── runner.js            # Evaluation framework with metrics
├── public/
│   ├── index.html               # Frontend UI
│   ├── css/styles.css           # Premium dark theme
│   └── js/app.js                # Frontend controller
└── package.json
```

## 🔧 Validation & Repair System

The repair engine handles:

| Error Type | Repair Strategy |
|-----------|----------------|
| Missing required fields | Add sensible defaults based on field name and context |
| Type mismatches | Coerce values (string→number, etc.) |
| Invalid enum values | Fuzzy match to closest valid value |
| Pattern violations | Auto-fix (e.g., prepend `/` to routes) |
| Additional properties | Remove unknown fields |
| Empty arrays | Add default items |
| Cross-layer mismatches | Add missing roles, tables, or endpoints |

## 📊 Evaluation Framework

20 test prompts across two categories:

### Real Product Prompts (10)
- CRM, E-Commerce, SaaS, Social Network, Healthcare, Learning Platform, HR Management, Inventory System, Blog Platform, Food Delivery

### Edge Cases (10)
- Extremely vague, Conflicting requirements, Incomplete spec, Over-complex, Heavy jargon, Typos/bad grammar, Partial nonsense, Single feature, Implicit requirements, Contradictory auth

### Metrics Tracked
- Success rate, Retry count, Token usage, Latency, Quality score (0-100), Runtime executability

## 💰 Cost vs Quality Tradeoff

| Model | Speed | Cost | Quality | Recommended For |
|-------|-------|------|---------|----------------|
| Gemini 2.0 Flash | Fast (~8s) | Low | Good | Development, iteration |
| Gemini 2.5 Flash | Medium (~15s) | Medium | Better | Production |
| Gemini 2.0 Pro | Slow (~25s) | High | Best | Critical applications |

### Optimization Strategies
1. **Low temperature (0.1)** reduces variance and retries
2. **Structured JSON mode** eliminates parsing failures
3. **Targeted retry** (only failed stages, not full pipeline)
4. **Auto-repair** reduces LLM re-calls by fixing common issues locally
5. **Schema validation** catches errors before expensive refinement calls

## 🛡️ Failure Handling

| Input Type | Strategy |
|-----------|----------|
| Vague prompts | Make documented assumptions, flag ambiguities |
| Conflicting requirements | Resolve with reasonable defaults, document in assumptions |
| Underspecified inputs | Infer from app type and common patterns |
| Invalid/gibberish | Return structured error with suggestions |
| Overly complex | Generate core features, note limitations |

## 📜 License

MIT
