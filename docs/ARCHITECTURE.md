# AppForge Architecture Document

## System Overview

AppForge is a **compiler for software generation** that transforms natural language descriptions into structured, validated, and executable application configurations. Like a traditional compiler, it uses a multi-stage pipeline where each stage produces an intermediate representation (IR) that feeds into the next.

## Design Philosophy

### Why Multi-Stage?

A single LLM prompt cannot reliably produce complex, interconnected schemas across 5+ layers. By decomposing the problem:

1. **Each stage has focused responsibility** — smaller context window, more precise output
2. **Intermediate representations enable validation** — we can catch errors between stages
3. **Targeted repair is possible** — we can re-generate only the failed stage, not the entire output
4. **Determinism improves** — each stage has constrained output format via JSON Schema

### Compiler Analogy

| Traditional Compiler | AppForge |
|---------------------|----------|
| Lexer/Tokenizer | Intent Extraction |
| Parser/AST | System Design |
| Code Generator | Schema Generation |
| Optimizer | Cross-Layer Refinement |
| Linker/Validator | Final Validation + Runtime |

## Pipeline Architecture

```
User Input (NL)
    │
    ▼
┌─────────────────────┐
│  Stage 1: INTENT    │ ──▶ Intent IR (features, entities, roles)
│  - NLP parsing      │     Validated against intentSchema
│  - Entity extraction│
│  - Role detection   │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Stage 2: DESIGN    │ ──▶ Design IR (architecture, entity model, pages)
│  - Architecture     │     Validated against designSchema
│  - Entity modeling  │
│  - Page planning    │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Stage 3: SCHEMA    │ ──▶ Multi-layer config:
│  - UI generation    │     ├── UI Config (pages, components, navigation)
│  - API generation   │     ├── API Config (endpoints, methods, auth)
│  - DB generation    │     ├── DB Schema (tables, columns, relations)
│  - Auth generation  │     ├── Auth Config (roles, permissions, rules)
│  - Logic generation │     └── Business Logic (rules, triggers, actions)
└─────────────────────┘     Each validated against respective schema
    │
    ▼
┌─────────────────────┐
│  Stage 4: REFINE    │ ──▶ Cross-layer validated configs
│  - Consistency check│     Repairs applied:
│  - Auto-repair      │     - Missing roles added
│  - LLM-assisted fix │     - Missing tables created
└─────────────────────┘     - Endpoint references fixed
    │
    ▼
┌─────────────────────┐
│  Stage 5: VALIDATE  │ ──▶ Final report + Runtime artifacts:
│  - Full schema check│     ├── SQL DDL
│  - Runtime codegen  │     ├── Express.js routes
│  - Execution sim    │     ├── React preview HTML
└─────────────────────┘     ├── Auth middleware
                            └── Business rules engine
```

## Validation System

### Three-Layer Validation

1. **JSON Schema Validation** (AJV): Every output is validated against formal JSON Schemas
2. **Auto-Repair Engine**: 7 repair strategies for common LLM output errors
3. **Cross-Layer Consistency**: Ensures API↔DB, UI↔API, Auth↔All relationships are valid

### Repair Strategies

```
Missing Required Fields ─── Add sensible defaults based on field name/context
Type Mismatches ────────── Coerce values (string→number, etc.)
Invalid Enum Values ────── Fuzzy match to closest valid value
Pattern Violations ─────── Auto-fix (e.g., prepend / to routes)
Additional Properties ──── Remove unknown fields
Empty Arrays ───────────── Add default items
Cross-Layer Mismatches ─── Add missing roles/tables/endpoints
```

## Runtime Execution

The runtime simulator generates 5 types of executable artifacts:

1. **SQL DDL**: Complete CREATE TABLE statements with foreign keys, indexes, constraints
2. **Express.js Routes**: Full route handlers with auth middleware, CRUD operations
3. **React App HTML**: Rendered dashboard with navigation, components, data bindings
4. **Auth Middleware**: JWT authentication + role-based authorization
5. **Business Rules Engine**: Executable rule functions with conditions and actions

## Cost Optimization

### Strategies Employed

1. **Temperature 0.1**: Reduces output variance → fewer retries → lower cost
2. **JSON mode**: Gemini's `responseMimeType: 'application/json'` eliminates parsing failures
3. **Targeted retry**: Only re-runs failed stages, not the entire pipeline
4. **Local repair**: Auto-fixes common errors without additional LLM calls
5. **Schema constraints in prompts**: Reduces hallucination → fewer validation failures

### Cost Breakdown (Gemini 2.0 Flash)

| Stage | Avg Tokens | Est. Cost |
|-------|-----------|-----------|
| Intent | ~1,500 | ~$0.0002 |
| Design | ~2,500 | ~$0.0004 |
| Schema | ~5,000 | ~$0.0008 |
| Refinement | ~3,000 (when needed) | ~$0.0005 |
| **Total** | **~12,000** | **~$0.002** |

## Determinism

### Techniques for Consistent Output

1. **Low temperature (0.1)**: Minimal randomness in LLM sampling
2. **Structured prompts**: Exact output format specification with JSON Schema
3. **JSON response mode**: Eliminates formatting variance
4. **Modular generation**: Each stage has focused, well-defined input/output
5. **Post-processing**: Schema validation + repair normalizes edge cases

## Failure Handling Matrix

| Failure Mode | Detection | Resolution |
|-------------|-----------|------------|
| Invalid JSON | JSON.parse error | Extract JSON from markdown fences, fix trailing commas |
| Missing required fields | AJV validation | Add defaults based on field name and context |
| Hallucinated fields | additionalProperties check | Remove unknown properties |
| Type mismatches | AJV type validation | Coerce to expected type |
| Cross-layer inconsistency | CrossLayerValidator | Auto-add missing roles/tables/endpoints |
| LLM timeout | Fetch error | Retry with exponential backoff (max 3 attempts) |
| Vague input | Low entity/feature count | Make documented assumptions, flag ambiguities |
| Conflicting requirements | Contradiction detection | Resolve with reasonable defaults, document in assumptions |
