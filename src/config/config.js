import path from 'node:path';

const root = process.cwd();

export const config = {
  root,
  rawDataDir: path.join(root, 'data/coir_apps/raw'),
  processedDir: path.join(root, 'data/coir_apps/processed'),
  indexDir: path.join(root, 'data/coir_apps/index'),
  resultsDir: path.join(root, 'results/experiments'),
  model: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
  semanticWeight: Number(process.env.SEMANTIC_WEIGHT || 0.65),
  lexicalWeight: Number(process.env.LEXICAL_WEIGHT || 0.35),
  candidatePool: Number(process.env.CANDIDATE_POOL || 100)
};