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
  console.log('====================================================');
  console.log('  AGENTIC CODE RETRIEVAL - EVALUATION HARNESS (P0)  ');
  console.log('====================================================\n');

  const startAll = performance.now();

  // 1. Load Corpus
  console.log('1/5 Loading corpus...');
  const corpus = await loadCorpus();
  const corpusMap = new Map(corpus.map((d) => [d.id, d]));
  console.log(`Corpus loaded: ${corpus.length} documents.`);

  // 2. Load Queries and Qrels
  console.log('2/5 Loading test set queries & relevance judgments (qrels)...');
  const queries = await loadQueries();
  const { qrelsMap, pairs } = await loadQrels('test');
  console.log(`Loaded ${queries.length} queries and ${pairs.length} test relevance pairs.`);

  // 3. Initialize & Build Indices
  console.log('3/5 Initializing BM25 and Dense Vector Indices...');
  const bm25Index = new BM25Index();
  bm25Index.build(corpus);

  embeddingCache.load();
  console.log(`Loaded ${embeddingCache.size()} cached dense vectors.`);
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

  // 4. Run Evaluation on Test Set
  console.log('4/5 Running Evaluation against CoIR Apps Test Split...');
  const evalResults = await evaluator.evaluateSplit(queries, qrelsMap, {
    mode: 'hybrid',
    useQueryPreprocessing: true,
    useReranker: true,
    useDiversity: true,
    topK: 10,
    candidatePoolSize: 50,
  }, 500); // evaluate on test queries subset (or full split)

  const totalDuration = ((performance.now() - startAll) / 1000).toFixed(2);

  // 5. Output Results & Print Summary Table
  console.log('\n====================================================');
  console.log('               EVALUATION RESULTS                   ');
  console.log('====================================================');
  console.log(` Primary Metric - MRR:       ${evalResults.mrr}`);
  console.log(` Primary Metric - NDCG@10:  ${evalResults.ndcg10}`);
  console.log(` Secondary Metric - Recall@10: ${evalResults.recall10}`);
  console.log(` Evaluated Test Queries:     ${evalResults.queryCount}`);
  console.log(` Average Query Latency:      ${evalResults.avgLatencyMs} ms`);
  console.log(` Total Evaluation Time:      ${totalDuration} s`);
  console.log('====================================================\n');

  // Save results to JSON file
  const resultsDir = config.paths.resultsDir;
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultPayload = {
    timestamp: new Date().toISOString(),
    dataset: 'CoIR Apps (test split)',
    metrics: {
      MRR: evalResults.mrr,
      'NDCG@10': evalResults.ndcg10,
      'Recall@10': evalResults.recall10,
    },
    latency: {
      avgQueryLatencyMs: evalResults.avgLatencyMs,
      totalSec: Number(totalDuration),
    },
    evalQueryCount: evalResults.queryCount,
    configuration: {
      embeddingModel: config.embedding.modelName,
      bm25Params: config.bm25,
      retrievalWeights: {
        semanticWeight: config.retrieval.semanticWeight,
        lexicalWeight: config.retrieval.lexicalWeight,
      },
      candidatePoolSize: config.retrieval.candidatePoolSize,
      rerankerEnabled: true,
      diversityEnabled: true,
    },
  };

  const evalJsonPath = path.join(resultsDir, 'evaluation_summary.json');
  fs.writeFileSync(evalJsonPath, JSON.stringify(resultPayload, null, 2), 'utf8');
  console.log(`Saved evaluation summary JSON to: ${evalJsonPath}`);
}

main().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
