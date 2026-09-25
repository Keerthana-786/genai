document.addEventListener('DOMContentLoaded', () => {
  // Elements - Navigation & System
  const segmentedBtns = document.querySelectorAll('.segmented-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const systemStatus = document.getElementById('system-status');
  const toast = document.getElementById('toast');

  // Session Stats
  const statQueriesRun = document.getElementById('stat-queries-run');
  const statAvgLatency = document.getElementById('stat-avg-latency');
  let queryCount = parseInt(localStorage.getItem('queries_count') || '0', 10);
  let totalLatency = parseInt(localStorage.getItem('total_latency') || '0', 10);

  function updateSessionStats(latencyMs = 0) {
    if (latencyMs > 0) {
      queryCount += 1;
      totalLatency += latencyMs;
      localStorage.setItem('queries_count', queryCount);
      localStorage.setItem('total_latency', totalLatency);
    }
    const avg = queryCount > 0 ? Math.round(totalLatency / queryCount) : 120;
    if (statQueriesRun) statQueriesRun.textContent = queryCount;
    if (statAvgLatency) statAvgLatency.textContent = `${avg}ms`;
  }
  updateSessionStats();

  // Elements - AI Code Assistant
  const aiCodeForm = document.getElementById('ai-code-form');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const dropzonePrompt = document.getElementById('dropzone-prompt');
  const fileLoadedBadge = document.getElementById('file-loaded-badge');
  const fileNameDisplay = document.getElementById('file-name-display');
  const fileSizeDisplay = document.getElementById('file-size-display');
  const btnClearFile = document.getElementById('btn-clear-file');
  const languageSelect = document.getElementById('language-select');
  const codeStats = document.getElementById('code-stats');
  const btnClearCode = document.getElementById('btn-clear-code');
  const codeInput = document.getElementById('code-input');
  const intentBtns = document.querySelectorAll('.intent-btn');
  const aiCustomQuery = document.getElementById('ai-custom-query');
  const btnAskAi = document.getElementById('btn-ask-ai');
  const ragToggle = document.getElementById('rag-toggle');
  const aiResponseContainer = document.getElementById('ai-response-container');
  const aiModelBadge = document.getElementById('ai-model-badge');
  const aiLangBadge = document.getElementById('ai-lang-badge');
  const aiComplexityBadge = document.getElementById('ai-complexity-badge');
  const aiLatencyBadge = document.getElementById('ai-latency-badge');
  const aiAnswerContent = document.getElementById('ai-answer-content');
  const btnCopyAnswer = document.getElementById('btn-copy-answer');
  const sampleLinks = document.querySelectorAll('.sample-link');

  // Elements - Corpus Search
  const searchForm = document.getElementById('search-form');
  const queryInput = document.getElementById('query-input');
  const searchBtn = document.getElementById('search-btn');
  const topKSelect = document.getElementById('top-k-select');
  const modeSelect = document.getElementById('mode-select');
  const rerankerToggle = document.getElementById('reranker-toggle');
  const diversityToggle = document.getElementById('diversity-toggle');
  const statsBar = document.getElementById('stats-bar');
  const statCount = document.getElementById('stat-count');
  const statLatency = document.getElementById('stat-latency');
  const statIntent = document.getElementById('stat-intent');
  const statTerms = document.getElementById('stat-terms');
  const resultsContainer = document.getElementById('results-container');

  let activeFilename = '';
  let activeTask = 'explain';

  // --- Custom Directional Arrow Cursor ---
  const cursorEl = document.getElementById('custom-cursor');
  let lastX = window.innerWidth / 2;
  let lastY = window.innerHeight / 2;
  let currentAngle = 0;

  if (cursorEl) {
    window.addEventListener('mousemove', (e) => {
      const x = e.clientX;
      const y = e.clientY;
      const dx = x - lastX;
      const dy = y - lastY;

      if (Math.hypot(dx, dy) > 2) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        currentAngle = angle;
      }

      cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${currentAngle}deg)`;
      lastX = x;
      lastY = y;

      const isHover = e.target.closest('button, a, input, select, textarea, .intent-btn, .sample-link, .segmented-btn, .dropzone-area');
      if (isHover) {
        cursorEl.classList.add('hovering');
      } else {
        cursorEl.classList.remove('hovering');
      }
    });

    window.addEventListener('mousedown', () => {
      cursorEl.classList.add('clicking');
    });

    window.addEventListener('mouseup', () => {
      cursorEl.classList.remove('clicking');
    });
  }

  // Sample code snippets
  const SAMPLE_CODES = {
    'binary-search': {
      lang: 'PYTHON',
      filename: 'binary_search.py',
      query: 'Find the bug in this binary search algorithm and fix it.',
      task: 'bug',
      code: `def binary_search(arr, target):
    low = 0
    high = len(arr) # BUG: Should be len(arr) - 1

    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return -1

nums = [1, 3, 5, 7, 9, 11]
print("Index:", binary_search(nums, 11))`
    },
    'js-fetch': {
      lang: 'JAVASCRIPT',
      filename: 'cacheManager.js',
      query: 'Explain how this cache manager works and suggest optimizations.',
      task: 'explain',
      code: `class AsyncCacheManager {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    const expiresAt = Date.now() + this.ttl;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async fetchWithCache(key, fetchFn) {
    const cached = this.get(key);
    if (cached) return cached;
    const freshData = await fetchFn();
    this.set(key, freshData);
    return freshData;
  }
}`
    },
    'knapsack': {
      lang: 'PYTHON',
      filename: 'knapsack_dp.py',
      query: 'Analyze time complexity and refactor this recursive knapsack with dynamic programming.',
      task: 'optimize',
      code: `def knapsack(weights, values, capacity, n):
    if n == 0 or capacity == 0:
        return 0

    if weights[n - 1] > capacity:
        return knapsack(weights, values, capacity, n - 1)
    else:
        return max(
            values[n - 1] + knapsack(weights, values, capacity - weights[n - 1], n - 1),
            knapsack(weights, values, capacity, n - 1)
        )

values = [60, 100, 120]
weights = [10, 20, 30]
capacity = 50
print("Max value:", knapsack(weights, values, capacity, len(values)))`
    },
    'bfs': {
      lang: 'C++',
      filename: 'graph_bfs.cpp',
      query: 'Generate unit tests and verify edge cases for this BFS algorithm.',
      task: 'test',
      code: `#include <iostream>
#include <vector>
#include <queue>

using namespace std;

vector<int> bfs(int startNode, int n, const vector<vector<int>>& adj) {
    vector<bool> visited(n, false);
    vector<int> traversalOrder;
    queue<int> q;

    visited[startNode] = true;
    q.push(startNode);

    while (!q.empty()) {
        int curr = q.front();
        q.pop();
        traversalOrder.push_back(curr);

        for (int neighbor : adj[curr]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                q.push(neighbor);
            }
        }
    }
    return traversalOrder;
}`
    }
  };

  // Health check
  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.status === 'ok' && systemStatus) {
        systemStatus.textContent = 'SYSTEM ONLINE';
      }
    } catch {
      if (systemStatus) systemStatus.textContent = 'CONNECTING';
    }
  }
  checkHealth();

  // Segmented Control Tab switching
  segmentedBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      segmentedBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(target).classList.add('active');
    });
  });

  // Intent Selection Buttons
  intentBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      intentBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeTask = btn.getAttribute('data-task');
      aiCustomQuery.value = btn.getAttribute('data-query');
    });
  });

  // Sample Load Links
  sampleLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const sampleKey = link.getAttribute('data-sample');
      const queryKey = link.getAttribute('data-query');

      if (sampleKey && SAMPLE_CODES[sampleKey]) {
        const sample = SAMPLE_CODES[sampleKey];
        codeInput.value = sample.code;
        languageSelect.value = sample.lang;
        activeFilename = sample.filename;
        aiCustomQuery.value = sample.query;
        activeTask = sample.task;

        intentBtns.forEach((b) => {
          if (b.getAttribute('data-task') === sample.task) b.classList.add('active');
          else b.classList.remove('active');
        });

        fileNameDisplay.textContent = sample.filename;
        fileSizeDisplay.textContent = `(${Math.round(sample.code.length / 1024 * 10) / 10} KB)`;
        fileLoadedBadge.classList.remove('hidden');
        dropzonePrompt.classList.add('hidden');
        updateCodeStats();
        showToast(`Loaded ${sample.filename}`);
      } else if (queryKey) {
        queryInput.value = queryKey;
        executeSearch();
      }
    });
  });

  // File Dropzone Handling
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files.length) handleFiles(dt.files);
  });

  function handleFiles(files) {
    if (!files || !files.length) return;
    const file = files[0];
    activeFilename = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      codeInput.value = e.target.result;
      fileNameDisplay.textContent = file.name;
      fileSizeDisplay.textContent = `(${Math.round(file.size / 1024 * 10) / 10} KB)`;
      fileLoadedBadge.classList.remove('hidden');
      dropzonePrompt.classList.add('hidden');
      autoDetectLanguage(file.name);
      updateCodeStats();
      showToast(`Uploaded ${file.name}`);
    };
    reader.readAsText(file);
  }

  btnClearFile.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.value = '';
    activeFilename = '';
    fileLoadedBadge.classList.add('hidden');
    dropzonePrompt.classList.remove('hidden');
  });

  btnClearCode.addEventListener('click', () => {
    codeInput.value = '';
    activeFilename = '';
    fileLoadedBadge.classList.add('hidden');
    dropzonePrompt.classList.remove('hidden');
    updateCodeStats();
  });

  codeInput.addEventListener('input', updateCodeStats);

  function updateCodeStats() {
    const code = codeInput.value;
    const lines = code ? code.split('\n').length : 0;
    const chars = code.length;
    codeStats.textContent = `${lines} lines | ${chars} chars`;
  }

  function autoDetectLanguage(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const extMap = {
      py: 'PYTHON', js: 'JAVASCRIPT', jsx: 'JAVASCRIPT', ts: 'TYPESCRIPT', tsx: 'TYPESCRIPT',
      cpp: 'C++', c: 'C++', h: 'C++', hpp: 'C++', java: 'JAVA', go: 'GO', rs: 'RUST',
      html: 'HTML', sql: 'SQL'
    };
    if (extMap[ext]) languageSelect.value = extMap[ext];
  }

  // AI Form Submission
  aiCodeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();
    if (!code) {
      showToast('Please enter or upload code first.', true);
      codeInput.focus();
      return;
    }

    const query = aiCustomQuery.value.trim() || 'Analyze and explain this code.';
    const language = languageSelect.value;
    const useRAG = ragToggle ? ragToggle.checked : false;

    btnAskAi.disabled = true;
    btnAskAi.innerHTML = '<span>Analyzing...</span>';

    aiResponseContainer.classList.remove('hidden');
    aiAnswerContent.innerHTML = `
      <div class="empty-state-editorial">
        <p class="empty-title">Processing Code Analysis</p>
        <p class="empty-desc">Evaluating syntax structures, computing complexity, and generating recommendations...</p>
      </div>
    `;

    aiResponseContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const startTime = performance.now();
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          filename: activeFilename,
          language,
          query,
          task: activeTask,
          provider: 'gemini',
          useRAG,
        }),
      });

      const clientLatency = Math.round(performance.now() - startTime);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'AI Request failed');
      }

      renderAiResponse(data, clientLatency);
      updateSessionStats(clientLatency);
    } catch (err) {
      aiAnswerContent.innerHTML = `
        <div class="empty-state-editorial">
          <p class="empty-title" style="color:#ef4444;">Analysis Error</p>
          <p class="empty-desc">${escapeHtml(err.message)}</p>
        </div>
      `;
    } finally {
      btnAskAi.disabled = false;
      btnAskAi.innerHTML = '<span>Analyze Code</span>';
    }
  });

  function renderAiResponse(data, clientLatency) {
    const analysis = data.analysis || {};

    aiModelBadge.textContent = data.modelUsed || 'Google Gemini';
    aiLangBadge.textContent = data.language || 'CODE';
    aiComplexityBadge.textContent = analysis.estimatedComplexity || 'O(N)';
    aiLatencyBadge.textContent = `${data.latencyMs || clientLatency}ms`;

    const rawMarkdown = data.answer || 'No response generated.';
    let htmlContent = '';

    if (window.marked && typeof window.marked.parse === 'function') {
      htmlContent = window.marked.parse(rawMarkdown);
    } else {
      htmlContent = simpleMarkdownParser(rawMarkdown);
    }

    aiAnswerContent.innerHTML = htmlContent;

    // Wrap code blocks in clean editorial wrappers
    aiAnswerContent.querySelectorAll('pre').forEach((preBlock) => {
      const codeEl = preBlock.querySelector('code');
      if (!codeEl) return;

      const langMatch = (codeEl.className || '').match(/language-([a-zA-Z0-9_-]+)/);
      const langName = langMatch ? langMatch[1].toUpperCase() : (data.language || 'CODE');

      const wrapper = document.createElement('div');
      wrapper.className = 'editorial-code-wrapper';

      const header = document.createElement('div');
      header.className = 'editorial-code-header';
      header.innerHTML = `
        <span>${escapeHtml(langName)}</span>
        <button type="button" class="btn-editorial-ghost" style="padding:0.2rem 0.5rem;font-size:0.7rem;">Copy</button>
      `;

      const copyBtn = header.querySelector('button');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(codeEl.innerText).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        });
      });

      preBlock.parentNode.insertBefore(wrapper, preBlock);
      wrapper.appendChild(header);
      wrapper.appendChild(preBlock);
    });
  }

  btnCopyAnswer.addEventListener('click', () => {
    const text = aiAnswerContent.innerText;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard');
    });
  });

  // Corpus Search Engine (Tab 2)
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    executeSearch();
  });

  async function executeSearch() {
    const query = queryInput.value.trim();
    if (!query) return;

    searchBtn.disabled = true;
    searchBtn.innerHTML = '<span>Searching...</span>';

    resultsContainer.innerHTML = `
      <div class="empty-state-editorial">
        <p class="empty-title">Searching CoIR Corpus</p>
        <p class="empty-desc">Generating dense vector embeddings &amp; computing hybrid score fusion...</p>
      </div>
    `;

    try {
      const startTime = performance.now();
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          topK: parseInt(topKSelect.value, 10),
          mode: modeSelect.value,
          useReranker: rerankerToggle.checked,
          useDiversity: diversityToggle.checked,
          useQueryPreprocessing: true,
        }),
      });

      const data = await response.json();
      const clientLatency = Math.round(performance.now() - startTime);

      if (!response.ok) throw new Error(data.error || 'Retrieval failed');

      renderSearchResults(data, clientLatency);
      updateSessionStats(clientLatency);
    } catch (err) {
      resultsContainer.innerHTML = `
        <div class="empty-state-editorial">
          <p class="empty-title" style="color:#ef4444;">Retrieval Error</p>
          <p class="empty-desc">${escapeHtml(err.message)}</p>
        </div>
      `;
    } finally {
      searchBtn.disabled = false;
      searchBtn.innerHTML = '<span>Execute Search</span>';
    }
  }

  function renderSearchResults(data, clientLatency) {
    const results = data.results || [];
    const processed = data.processedQuery || {};

    statsBar.classList.remove('hidden');
    statCount.textContent = results.length;
    statLatency.textContent = `${data.latencyMs}ms server / ${clientLatency}ms total`;
    statIntent.textContent = processed.intent || 'GENERAL';
    statTerms.textContent = (processed.keywords || []).join(', ') || '';

    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="empty-state-editorial">
          <p class="empty-title">No Matching Snippets</p>
          <p class="empty-desc">No code patterns matched the specified query parameters.</p>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = results.map((item) => {
      const meta = item.metadata || {};
      const snippetHtml = escapeHtml(item.snippet);
      const title = meta.title ? escapeHtml(meta.title) : 'Code Snippet';
      const hfUrl = meta.hfUrl || 'https://huggingface.co/datasets/coir/coir_apps';
      const rankFormatted = String(item.rank).padStart(2, '0');
      const scorePercent = Math.min(100, Math.max(5, Math.round(item.score * 100)));

      return `
        <article class="result-item-editorial">
          <div class="result-header-row">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <span class="result-rank-num">${rankFormatted}</span>
              <span style="font-size:0.9rem;font-weight:600;color:var(--text-primary);">${title}</span>
            </div>
            <div style="display:flex;align-items:center;gap:0.75rem;font-family:var(--font-mono);font-size:0.75rem;">
              <span style="color:var(--text-muted);">${meta.language || 'PYTHON'}</span>
              <span style="color:var(--text-muted);">${(item.score * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div style="font-size:0.78rem;color:var(--text-muted);display:flex;gap:1rem;font-family:var(--font-mono);">
            <span>ID: ${item.corpusId}</span>
            <span><a href="${hfUrl}" target="_blank" style="color:var(--accent);text-decoration:none;">HuggingFace Source</a></span>
          </div>

          <div class="response-body">
            <pre><code>${snippetHtml}</code></pre>
          </div>

          <!-- Single Refined Confidence Indicator Fill Line -->
          <div class="confidence-fill-track" style="width: ${scorePercent}%;"></div>
        </article>
      `;
    }).join('');
  }

  function simpleMarkdownParser(md) {
    let html = escapeHtml(md);

    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang}">${code}</code></pre>`;
    });

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border-subtle);margin:1rem 0;" />');
    html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    html = html.replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim() !== '');
      if (match.includes('---')) return '';
      const row = cells.map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${row}</tr>`;
    });
    html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, '<table>$1</table>');

    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');

    html = html.split('\n\n').map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<ul') || p.startsWith('<blockquote') || p.startsWith('<table') || p.startsWith('<hr')) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.borderColor = isError ? '#ef4444' : 'var(--border-strong)';
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  updateCodeStats();
});
