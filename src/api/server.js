try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch {
  // .env file is optional
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../config');
const { loadCorpus } = require('../data/loader');
const { BM25Index } = require('../retrieval/bm25/bm25Index');
const { DenseVectorIndex } = require('../retrieval/dense/vectorIndex');
const { FeatureReranker } = require('../reranking/reranker');
const { embeddingService } = require('../embeddings/embeddingService');
const { embeddingCache } = require('../embeddings/cache');
const { PipelineEvaluator } = require('../evaluation/evaluator');
const { askCodeAI } = require('../ai/codeAiService');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../../public')));

let evaluator = null;
let corpusCount = 0;
let isReady = false;

async function initializeServer() {
  console.log('Initializing Code Retrieval API Server...');
  const corpus = await loadCorpus();
  corpusCount = corpus.length;
  const corpusMap = new Map(corpus.map((d) => [d.id, d]));

  const bm25Index = new BM25Index();
  bm25Index.build(corpus);

  embeddingCache.load();
  const denseIndex = new DenseVectorIndex();
  denseIndex.build(embeddingCache.getAll());

  const reranker = new FeatureReranker();

  evaluator = new PipelineEvaluator({
    corpusMap,
    denseIndex,
    bm25Index,
    reranker,
    embeddingService,
  });

  isReady = true;
  console.log(`Server ready! Loaded ${corpusCount} corpus documents & ${embeddingCache.size()} dense vectors.`);
}

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: isReady ? 'ok' : 'initializing',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/stats
app.get('/api/stats', (req, res) => {
  res.json({
    corpusCount,
    cachedEmbeddings: embeddingCache.size(),
    modelName: config.embedding.modelName,
    embeddingDimension: config.embedding.dimension,
    defaultTopK: config.retrieval.defaultTopK,
    candidatePoolSize: config.retrieval.candidatePoolSize,
  });
});

// POST /api/search
app.post('/api/search', async (req, res) => {
  if (!isReady || !evaluator) {
    return res.status(503).json({ error: 'System is still initializing dataset and embeddings.' });
  }

  try {
    const {
      query,
      topK = config.retrieval.defaultTopK,
      semanticWeight = config.retrieval.semanticWeight,
      lexicalWeight = config.retrieval.lexicalWeight,
      useReranker = true,
      useDiversity = true,
      useQueryPreprocessing = true,
      mode = 'hybrid',
    } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query field is required and must be a non-empty string.' });
    }

    const searchResponse = await evaluator.search(query, {
      topK: Number(topK),
      semanticWeight: Number(semanticWeight),
      lexicalWeight: Number(lexicalWeight),
      useReranker: Boolean(useReranker),
      useDiversity: Boolean(useDiversity),
      useQueryPreprocessing: Boolean(useQueryPreprocessing),
      mode,
    });

    res.json(searchResponse);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error processing retrieval request.', details: err.message });
  }
});

// POST /api/ai/ask
app.post('/api/ai/ask', async (req, res) => {
  try {
    const {
      code,
      filename,
      language,
      query,
      task = 'explain',
      apiKey,
      provider = 'builtin',
      useRAG = true,
    } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Code field is required and cannot be empty.' });
    }

    const aiResult = await askCodeAI({
      code,
      filename,
      language,
      query,
      task,
      apiKey,
      provider,
      evaluator: isReady ? evaluator : null,
      useRAG: Boolean(useRAG),
    });

    res.json(aiResult);
  } catch (err) {
    console.error('Code AI processing error:', err);
    res.status(500).json({ error: 'Failed to process Code AI request.', details: err.message });
  }
});

// POST /api/reindex
app.post('/api/reindex', async (req, res) => {
  try {
    console.log('Reindexing triggered via API...');
    await initializeServer();
    res.json({ status: 'success', message: 'Reindexing and index re-load complete.', corpusCount, cachedEmbeddings: embeddingCache.size() });
  } catch (err) {
    res.status(500).json({ error: 'Reindexing failed', details: err.message });
  }
});

const PORT = config.server.port;
initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  Agentic Code Intelligence System API Running          `);
    console.log(`  URL: http://localhost:${PORT}                          `);
    console.log(`=======================================================`);
  });
});

module.exports = app;
