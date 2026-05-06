// ═══════════════════════════════════════════════════════════
// AppForge Frontend — Controller
// ═══════════════════════════════════════════════════════════

const PRESETS = {
  crm: 'Build a CRM with login, contacts, dashboard, role-based access, and premium plan with payments. Admins can see analytics.',
  ecom: 'Create an online store with product listings, shopping cart, checkout with Stripe, user accounts, order tracking, and admin panel for inventory management.',
  saas: 'Build a project management tool like Trello. Users can create boards, lists, and cards. Support team workspaces, member invitations, due dates, labels, and activity logs.',
  social: 'Create a social media platform where users can post text and images, follow other users, like and comment on posts, and have a personalized feed.',
  health: 'Build a healthcare appointment system. Patients can book appointments with doctors, view medical records, and receive prescription notifications. Doctors manage their schedule. Admin manages the clinic.'
};

class AppForgeUI {
  constructor() {
    this.settings = this._loadSettings();
    this.currentResult = null;
    this.isProcessing = false;
    this._bindEvents();
    this._checkHealth();
  }

  _loadSettings() {
    try {
      return JSON.parse(localStorage.getItem('appforge-settings') || '{}');
    } catch { return {}; }
  }

  _saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('appforge-settings', JSON.stringify(this.settings));
  }

  _bindEvents() {
    // Generate button
    document.getElementById('btn-generate').addEventListener('click', () => this.generate());

    // Char counter
    const input = document.getElementById('prompt-input');
    input.addEventListener('input', () => {
      document.getElementById('char-count').textContent = `${input.value.length} chars`;
    });

    // Ctrl+Enter to generate
    input.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') this.generate();
    });

    // Presets
    document.getElementById('preset-select').addEventListener('change', (e) => {
      if (PRESETS[e.target.value]) {
        input.value = PRESETS[e.target.value];
        input.dispatchEvent(new Event('input'));
        e.target.value = '';
      }
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchTab(tab.dataset.tab));
    });

    // Settings modal
    document.getElementById('btn-settings').addEventListener('click', () => this._showModal('settings'));
    document.getElementById('btn-close-settings').addEventListener('click', () => this._hideModal('settings'));
    document.getElementById('btn-save-settings').addEventListener('click', () => this._saveSettingsForm());

    // Eval modal
    document.getElementById('btn-eval').addEventListener('click', () => this._showModal('eval'));
    document.getElementById('btn-close-eval').addEventListener('click', () => this._hideModal('eval'));
    document.getElementById('btn-run-eval').addEventListener('click', () => this._runEvaluation());

    // Copy & Download
    document.getElementById('btn-copy').addEventListener('click', () => this._copyOutput());
    document.getElementById('btn-download').addEventListener('click', () => this._downloadOutput());

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    });

    // Load saved API key
    if (this.settings.apiKey) {
      document.getElementById('setting-apikey').value = this.settings.apiKey;
    }
    if (this.settings.model) {
      document.getElementById('setting-model').value = this.settings.model;
    }
  }

  async _checkHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (!data.hasApiKey && !this.settings.apiKey) {
        // Show settings if no API key configured
        setTimeout(() => this._showModal('settings'), 500);
      }
    } catch { /* ignore */ }
  }

  // ═══════════════════════════════════════════
  // MAIN GENERATION
  // ═══════════════════════════════════════════
  async generate() {
    const prompt = document.getElementById('prompt-input').value.trim();
    if (!prompt) return alert('Please enter a prompt.');
    if (this.isProcessing) return;

    const apiKey = this.settings.apiKey;
    if (!apiKey) {
      this._showModal('settings');
      return alert('Please configure your API key first.');
    }

    this.isProcessing = true;
    this._resetPipeline();
    this._setGenerateButton(true);
    this._setPipelineStatus('running');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          apiKey,
          provider: this.settings.provider || 'gemini',
          model: this.settings.model || 'gemini-2.0-flash',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      this.currentResult = result;

      // Animate pipeline stages from progress events
      if (result.progressEvents) {
        for (const event of result.progressEvents) {
          this._updateStage(event.stage, event.status, event);
        }
      }

      if (result.success) {
        this._setPipelineStatus('complete');
        this._renderOutput(result);
        this._renderMetrics(result);
      } else {
        this._setPipelineStatus('error');
        this._renderError(result.error);
      }

    } catch (err) {
      this._setPipelineStatus('error');
      this._renderError(err.message);
    } finally {
      this.isProcessing = false;
      this._setGenerateButton(false);
    }
  }

  // ═══════════════════════════════════════════
  // PIPELINE UI
  // ═══════════════════════════════════════════
  _resetPipeline() {
    document.querySelectorAll('.stage').forEach(el => {
      el.className = 'stage';
      el.querySelector('.stage-time').textContent = '—';
    });
    document.querySelectorAll('.stage-connector').forEach(el => el.classList.remove('active'));
    document.getElementById('metrics-panel').style.display = 'none';

    // Reset output
    document.querySelectorAll('.tab-pane').forEach(pane => {
      if (pane.dataset.pane === 'intent') {
        pane.innerHTML = '<div class="placeholder-msg"><span class="placeholder-icon">⚡</span><p>Compiling...</p></div>';
      } else {
        pane.innerHTML = '';
      }
    });
  }

  _updateStage(stageName, status, data = {}) {
    const stageEl = document.querySelector(`.stage[data-stage="${stageName}"]`);
    if (!stageEl) return;

    stageEl.className = `stage ${status}`;

    if (status === 'complete' && data.timestamp) {
      const time = data.data ? '✓' : '—';
      stageEl.querySelector('.stage-time').textContent = time;
    }

    // Activate connector above this stage
    if (status === 'complete') {
      const prev = stageEl.previousElementSibling;
      if (prev?.classList.contains('stage-connector')) {
        prev.classList.add('active');
      }
    }
  }

  _setPipelineStatus(status) {
    const badge = document.getElementById('pipeline-status');
    badge.className = `status-badge ${status}`;
    badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  }

  _setGenerateButton(loading) {
    const btn = document.getElementById('btn-generate');
    btn.disabled = loading;
    btn.querySelector('.btn-label').style.display = loading ? 'none' : 'inline-flex';
    btn.querySelector('.btn-loading').style.display = loading ? 'inline-flex' : 'none';
  }

  // ═══════════════════════════════════════════
  // OUTPUT RENDERING
  // ═══════════════════════════════════════════
  _renderOutput(result) {
    const output = result.output || {};

    // Intent tab
    this._renderJSON('intent', output.intent);

    // Design tab
    this._renderJSON('design', output.design);

    // UI tab
    this._renderJSON('ui', output.ui);

    // API tab
    this._renderJSON('api', output.api);

    // DB tab
    this._renderJSON('db', output.db);

    // Auth tab
    this._renderJSON('auth', output.auth);

    // Business Logic tab
    this._renderJSON('logic', output.businessLogic);

    // Runtime tab
    this._renderRuntime(result.runtime, output);

    // Enable copy/download
    document.getElementById('btn-copy').disabled = false;
    document.getElementById('btn-download').disabled = false;

    // Update stage times from metrics
    if (result.metrics?.stages) {
      for (const [stage, data] of Object.entries(result.metrics.stages)) {
        const stageEl = document.querySelector(`.stage[data-stage="${stage}"]`);
        if (stageEl && data.latency) {
          stageEl.querySelector('.stage-time').textContent = `${(data.latency / 1000).toFixed(1)}s`;
          stageEl.className = 'stage complete';
        }
      }
    }
  }

  _renderJSON(tabName, data) {
    const pane = document.querySelector(`.tab-pane[data-pane="${tabName}"]`);
    if (!pane) return;
    if (!data) {
      pane.innerHTML = '<p class="meta-text" style="padding:1rem;">No data generated for this layer.</p>';
      return;
    }
    const highlighted = this._highlightJSON(JSON.stringify(data, null, 2));
    pane.innerHTML = `<pre class="json-output">${highlighted}</pre>`;
  }

  _highlightJSON(jsonStr) {
    return jsonStr
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"([^"]+)"(?=\s*:)/g, '<span class="json-key">"$1"</span>')
      .replace(/:\s*"([^"]*)"(?=[,\n\r\]}])/g, ': <span class="json-string">"$1"</span>')
      .replace(/:\s*(\d+\.?\d*)(?=[,\n\r\]}])/g, ': <span class="json-number">$1</span>')
      .replace(/:\s*(true|false)(?=[,\n\r\]}])/g, ': <span class="json-boolean">$1</span>')
      .replace(/:\s*(null)(?=[,\n\r\]}])/g, ': <span class="json-null">$1</span>');
  }

  _renderRuntime(runtime, output) {
    const pane = document.querySelector('.tab-pane[data-pane="runtime"]');
    if (!pane) return;

    if (!runtime) {
      pane.innerHTML = '<p class="meta-text" style="padding:1rem;">Runtime artifacts not generated.</p>';
      return;
    }

    let html = '';

    // Summary
    html += `<div class="runtime-section">
      <h3>📊 Runtime Summary</h3>
      <div class="metrics-grid" style="padding:0;">
        <div class="metric-card"><span class="metric-label">Tables</span><span class="metric-value">${runtime.summary?.tables || 0}</span></div>
        <div class="metric-card"><span class="metric-label">Endpoints</span><span class="metric-value">${runtime.summary?.endpoints || 0}</span></div>
        <div class="metric-card"><span class="metric-label">Pages</span><span class="metric-value">${runtime.summary?.pages || 0}</span></div>
        <div class="metric-card"><span class="metric-label">Roles</span><span class="metric-value">${runtime.summary?.roles || 0}</span></div>
        <div class="metric-card"><span class="metric-label">Rules</span><span class="metric-value">${runtime.summary?.rules || 0}</span></div>
        <div class="metric-card"><span class="metric-label">Status</span><span class="metric-value" style="color:${runtime.success ? 'var(--accent-green)' : 'var(--accent-red)'};">${runtime.success ? '✓ OK' : '✗ Fail'}</span></div>
      </div>
    </div>`;

    // SQL
    if (runtime.artifacts?.sql) {
      html += `<div class="runtime-section">
        <h3>🗄️ SQL Schema (PostgreSQL)</h3>
        <pre class="json-output" style="color: var(--accent-cyan);">${this._escapeHtml(runtime.artifacts.sql)}</pre>
      </div>`;
    }

    // Express Routes
    if (runtime.artifacts?.expressRoutes) {
      html += `<div class="runtime-section">
        <h3>🔌 Express.js Routes</h3>
        <pre class="json-output" style="color: var(--accent-green);">${this._escapeHtml(runtime.artifacts.expressRoutes)}</pre>
      </div>`;
    }

    // App Preview
    if (runtime.artifacts?.reactApp) {
      html += `<div class="runtime-section">
        <h3>🖥️ Application Preview</h3>
        <div class="runtime-preview-frame">
          <iframe id="preview-iframe" sandbox="allow-scripts"></iframe>
        </div>
      </div>`;
    }

    // Auth Middleware
    if (runtime.artifacts?.authMiddleware) {
      html += `<div class="runtime-section">
        <h3>🔐 Auth Middleware</h3>
        <pre class="json-output" style="color: var(--accent-purple);">${this._escapeHtml(runtime.artifacts.authMiddleware)}</pre>
      </div>`;
    }

    // Business Rules
    if (runtime.artifacts?.businessRules) {
      html += `<div class="runtime-section">
        <h3>⚙️ Business Rules Engine</h3>
        <pre class="json-output" style="color: var(--accent-amber);">${this._escapeHtml(runtime.artifacts.businessRules)}</pre>
      </div>`;
    }

    // Errors
    if (runtime.errors?.length) {
      html += `<div class="runtime-section">
        <h3>⚠️ Runtime Errors</h3>
        <div class="error-msg">${runtime.errors.map(e => `<p>[${e.layer}] ${e.error}</p>`).join('')}</div>
      </div>`;
    }

    pane.innerHTML = html;

    // Load preview iframe
    if (runtime.artifacts?.reactApp) {
      setTimeout(() => {
        const iframe = document.getElementById('preview-iframe');
        if (iframe) {
          iframe.srcdoc = runtime.artifacts.reactApp;
        }
      }, 100);
    }
  }

  _renderMetrics(result) {
    const panel = document.getElementById('metrics-panel');
    panel.style.display = 'block';

    const m = result.metrics || {};
    document.getElementById('m-latency').textContent = m.totalLatency ? `${(m.totalLatency / 1000).toFixed(1)}s` : '—';
    document.getElementById('m-tokens').textContent = m.totalTokens?.toLocaleString() || '—';
    document.getElementById('m-retries').textContent = m.totalRetries ?? '—';
    document.getElementById('m-repairs').textContent = m.totalRepairs ?? '—';

    const allValid = result.validation?.allValid;
    const valEl = document.getElementById('m-validation');
    valEl.textContent = allValid ? '✓ Pass' : '⚠ Issues';
    valEl.style.color = allValid ? 'var(--accent-green)' : 'var(--accent-amber)';

    const runtimeOk = result.runtime?.success;
    const rtEl = document.getElementById('m-runtime');
    rtEl.textContent = runtimeOk ? '✓ Executable' : '⚠ Partial';
    rtEl.style.color = runtimeOk ? 'var(--accent-green)' : 'var(--accent-amber)';

    // Show repairs
    if (m.repairs?.length) {
      const repairsList = document.getElementById('repairs-list');
      repairsList.style.display = 'block';
      document.getElementById('repairs-items').innerHTML = m.repairs.map(r => `<li>${r}</li>`).join('');
    }
  }

  _renderError(message) {
    const pane = document.querySelector('.tab-pane[data-pane="intent"]');
    if (pane) {
      pane.innerHTML = `<div class="error-msg"><strong>❌ Pipeline Error</strong><p>${this._escapeHtml(message)}</p></div>`;
    }
    this._switchTab('intent');
  }

  // ═══════════════════════════════════════════
  // TABS
  // ═══════════════════════════════════════════
  _switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tabName));
  }

  // ═══════════════════════════════════════════
  // MODALS
  // ═══════════════════════════════════════════
  _showModal(name) {
    document.getElementById(`${name}-modal`).style.display = 'flex';
  }
  _hideModal(name) {
    document.getElementById(`${name}-modal`).style.display = 'none';
  }

  _saveSettingsForm() {
    const apiKey = document.getElementById('setting-apikey').value.trim();
    const provider = document.getElementById('setting-provider').value;
    const model = document.getElementById('setting-model').value;
    this._saveSettings({ apiKey, provider, model });
    this._hideModal('settings');
  }

  // ═══════════════════════════════════════════
  // EVALUATION
  // ═══════════════════════════════════════════
  async _runEvaluation() {
    const btn = document.getElementById('btn-run-eval');
    const results = document.getElementById('eval-results');
    btn.disabled = true;
    btn.textContent = '⟳ Running evaluation...';
    results.innerHTML = '<p class="meta-text">Running 3 sample prompts through the pipeline...</p>';

    try {
      const res = await fetch('/api/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: this.settings.apiKey }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      let html = `<div style="margin-bottom:1rem;">
        <div class="metrics-grid" style="padding:0;">
          <div class="metric-card"><span class="metric-label">Success Rate</span><span class="metric-value">${data.overview?.successRate || '—'}</span></div>
          <div class="metric-card"><span class="metric-label">Avg Quality</span><span class="metric-value">${data.quality?.avgScore || '—'}</span></div>
          <div class="metric-card"><span class="metric-label">Avg Latency</span><span class="metric-value">${data.performance?.avgLatency || '—'}</span></div>
        </div>
      </div>`;

      if (data.individualResults) {
        html += `<table class="eval-table"><thead><tr><th>Prompt</th><th>Status</th><th>Quality</th><th>Latency</th><th>Retries</th></tr></thead><tbody>`;
        for (const r of data.individualResults) {
          html += `<tr>
            <td>${r.name}</td>
            <td class="${r.success ? 'eval-pass' : 'eval-fail'}">${r.success ? '✓' : '✗'}</td>
            <td>${r.quality?.score || 0}/100</td>
            <td>${(r.latency / 1000).toFixed(1)}s</td>
            <td>${r.retries}</td>
          </tr>`;
        }
        html += '</tbody></table>';
      }

      results.innerHTML = html;
    } catch (err) {
      results.innerHTML = `<div class="error-msg">${err.message}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '▶ Run Evaluation (3 sample prompts)';
    }
  }

  // ═══════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════
  _copyOutput() {
    if (!this.currentResult?.output) return;
    navigator.clipboard.writeText(JSON.stringify(this.currentResult.output, null, 2));
    const btn = document.getElementById('btn-copy');
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
  }

  _downloadOutput() {
    if (!this.currentResult?.output) return;
    const blob = new Blob([JSON.stringify(this.currentResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appforge-output-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  _escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.appForge = new AppForgeUI();
});
