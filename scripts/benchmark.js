const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { loadCorpus, loadQueries, loadQrels } = require('../src/data/loader');
const { BM25Index } = require('../src/retrieval/bm25/bm25Index');
const { DenseVectorIndex } = require('../src/retrieval/dense/vectorIndex');
const { FeatureReranker } = require('../src/reranking/reranker');
const { embeddingService } = require('../src/embeddings/embeddingService');
const { embeddingCache } = require('../src/embeddings/cache');
const { PipelineEvaluator } = require('../src/evaluation/evaluator');

async function main() {
  console.log('===========================================================');
  console.log('  AGENTIC CODE RETRIEVAL - REPRODUCIBLE EXPERIMENT SUITE   ');
  console.log('===========================================================\n');

  // Load dataset
  console.log('Loading dataset and indices...');
  const corpus = await loadCorpus();
  const corpusMap = new Map(corpus.map((d) => [d.id, d]));
  const queries = await loadQueries();
  const { qrelsMap } = await loadQrels('test');

  const bm25Index = new BM25Index();
  bm25Index.build(corpus);

  embeddingCache.load();
  const denseIndex = new DenseVectorIndex();
  denseIndex.build(embeddingCache.getAll());

  const reranker = new FeatureReranker();

  const evaluator = new PipelineEvaluator({
    corpusMap,
    denseIndex,
    bm25Index,
    reranker,
    embeddingService,
  });

  const experimentConfigs = [
    {
      name: 'Experiment A: Dense Only',
      options: { mode: 'dense', useQueryPreprocessing: false, useReranker: false, useDiversity: false },
    },
    {
      name: 'Experiment B: BM25 Only',
      options: { mode: 'bm25', useQueryPreprocessing: false, useReranker: false, useDiversity: false },
    },
    {
      name: 'Experiment C: Hybrid (Dense + BM25)',
      options: { mode: 'hybrid', semanticWeight: 0.5, lexicalWeight: 0.5, useQueryPreprocessing: false, useReranker: false, useDiversity: false },
    },
    {
      name: 'Experiment D: Hybrid + Reranking',
      options: { mode: 'hybrid', semanticWeight: 0.5, lexicalWeight: 0.5, useQueryPreprocessing: false, useReranker: true, useDiversity: false },
    },
    {
      name: 'Experiment E: Hybrid + Reranking + Query Preprocessing',
      options: { mode: 'hybrid', semanticWeight: 0.5, lexicalWeight: 0.5, useQueryPreprocessing: true, useReranker: true, useDiversity: true },
    },
  ];

  const results = [];
  const evalLimit = 100; // Evaluate 100 test queries per experiment for fast reproducible benchmark

  for (const exp of experimentConfigs) {
    console.log(`Running ${exp.name}...`);
    const evalRes = await evaluator.evaluateSplit(queries, qrelsMap, exp.options, evalLimit);

    results.push({
      experiment: exp.name,
      mrr: evalRes.mrr,
      ndcg10: evalRes.ndcg10,
      recall10: evalRes.recall10,
      avgLatencyMs: evalRes.avgLatencyMs,
      options: exp.options,
    });
    console.log(`  -> MRR: ${evalRes.mrr} | NDCG@10: ${evalRes.ndcg10} | Latency: ${evalRes.avgLatencyMs}ms\n`);
  }

  // Print comparison markdown table
  console.log('\n========================================================================================');
  console.log('                          EXPERIMENT COMPARISON SUMMARY                                  ');
  console.log('========================================================================================');
  console.log('| Experiment Name                                    | MRR    | NDCG@10 | Recall@10 | Latency (ms) |');
  console.log('|----------------------------------------------------|--------|---------|-----------|--------------|');
  for (const res of results) {
    const expPad = res.experiment.padEnd(50, ' ');
    const mrrStr = res.mrr.toFixed(4).padStart(6, ' ');
    const ndcgStr = res.ndcg10.toFixed(4).padStart(7, ' ');
    const recallStr = res.recall10.toFixed(4).padStart(9, ' ');
    const latStr = res.avgLatencyMs.toFixed(2).padStart(12, ' ');
    console.log(`| ${expPad} | ${mrrStr} | ${ndcgStr} | ${recallStr} | ${latStr} |`);
  }
  console.log('========================================================================================\n');

  // Save experiment results to JSON
  const resultsDir = config.paths.resultsDir;
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const jsonPath = path.join(resultsDir, 'results.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ timestamp: new Date().toISOString(), experiments: results }, null, 2), 'utf8');
  console.log(`Saved experiment benchmark results to ${jsonPath}`);
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
