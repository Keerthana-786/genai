const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');

module.exports = {
  paths: {
    rootDir: ROOT_DIR,
    rawDataDir: path.join(ROOT_DIR, 'data/coir_apps/raw'),
    processedDataDir: path.join(ROOT_DIR, 'data/coir_apps/processed'),
    embeddingsDir: path.join(ROOT_DIR, 'data/coir_apps/embeddings'),
    indexDir: path.join(ROOT_DIR, 'data/coir_apps/index'),
    resultsDir: path.join(ROOT_DIR, 'results/experiments'),
  },

  embedding: {
    modelName: 'Xenova/all-MiniLM-L6-v2', // Lightweight 384D ONNX embedding model
    dimension: 384,
    batchSize: 32,
    normalize: true,
  },

  bm25: {
    k1: 1.2,
    b: 0.75,
  },

  retrieval: {
    defaultTopK: 10,
    candidatePoolSize: 50,
    semanticWeight: 0.5,
    lexicalWeight: 0.5,
    rrfK: 60,
    fusionMethod: 'hybrid', // 'hybrid' (weighted sum) or 'rrf'
  },

  reranker: {
    enabled: true,
    exactMatchBonus: 0.15,
    identifierCoverageWeight: 0.25,
    structureMatchBonus: 0.1,
  },

  diversity: {
    enabled: true,
    duplicateThreshold: 0.88, // Jaccard token overlap threshold
  },

  server: {
    port: process.env.PORT || 3000,
  }
};
