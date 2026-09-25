const { preprocessQuery } = require('../preprocessing/query/queryPreprocessor');
const { combineScores } = require('../retrieval/hybrid/hybridRetriever');
const { deduplicateResults } = require('../diversity/deduplicator');
const { calculateReciprocalRank, calculateNDCG, calculateRecall } = require('./metrics');

class PipelineEvaluator {
  constructor({
    corpusMap,
    denseIndex,
    bm25Index,
    reranker,
    embeddingService,
    configOptions = {},
  }) {
    this.corpusMap = corpusMap;
    this.denseIndex = denseIndex;
    this.bm25Index = bm25Index;
    this.reranker = reranker;
    this.embeddingService = embeddingService;
    this.configOptions = configOptions;
  }

  /**
   * Run search for a single query object
   */
  async search(rawQueryText, options = {}) {
    const startTime = performance.now();
    const usePreprocessing = options.useQueryPreprocessing !== false;
    const useReranker = options.useReranker !== false;
    const useDiversity = options.useDiversity !== false;
    const mode = options.mode || 'hybrid'; // 'dense', 'bm25', 'hybrid'
    const topK = options.topK || 10;
    const poolSize = options.candidatePoolSize || 50;

    // 1. Query Preprocessing
    const queryPrepStart = performance.now();
    const queryProcessed = usePreprocessing
      ? preprocessQuery(rawQueryText)
      : { original: rawQueryText, cleaned: rawQueryText, keywords: rawQueryText.split(/\s+/), terms: rawQueryText.split(/\s+/) };
    const queryPrepTime = performance.now() - queryPrepStart;

    let denseResults = [];
    let bm25Results = [];
    let denseTime = 0;
    let bm25Time = 0;

    // 2. Dense Retrieval
    if (mode === 'dense' || mode === 'hybrid') {
      const dStart = performance.now();
      try {
        const queryEmbedding = await this.embeddingService.getEmbedding(queryProcessed.cleaned || queryProcessed.original);
        denseResults = this.denseIndex.search(queryEmbedding, poolSize);
      } catch (err) {
        denseResults = [];
      }
      denseTime = performance.now() - dStart;
    }

    // 3. Lexical Retrieval (BM25)
    if (mode === 'bm25' || mode === 'hybrid') {
      const bStart = performance.now();
      const terms = queryProcessed.terms && queryProcessed.terms.length > 0 ? queryProcessed.terms : queryProcessed.original.split(/\s+/);
      bm25Results = this.bm25Index.search(terms, poolSize);
      bm25Time = performance.now() - bStart;
    }

    // 4. Score Fusion & Candidate Pool
    const fusionStart = performance.now();
    let candidates = [];
    if (mode === 'dense') {
      candidates = denseResults.map((r) => ({ id: r.id, score: r.score }));
    } else if (mode === 'bm25') {
      candidates = bm25Results.map((r) => ({ id: r.id, score: r.score }));
    } else {
      candidates = combineScores({
        denseResults,
        bm25Results,
        semanticWeight: options.semanticWeight ?? 0.5,
        lexicalWeight: options.lexicalWeight ?? 0.5,
        fusionMethod: options.fusionMethod || 'hybrid',
        candidatePoolSize: poolSize,
      });
    }
    const fusionTime = performance.now() - fusionStart;

    // 5. Reranking
    const rerankStart = performance.now();
    let rankedCandidates = candidates;
    if (useReranker && this.reranker) {
      const denseMap = new Map(denseResults.map((r) => [r.id, r.score]));
      const bm25Map = new Map(bm25Results.map((r) => [r.id, r.score]));

      rankedCandidates = this.reranker.rerank({
        queryProcessed,
        candidates,
        corpusMap: this.corpusMap,
        denseScoreMap: denseMap,
        bm25ScoreMap: bm25Map,
      });
    }
    const rerankTime = performance.now() - rerankStart;

    // 6. Result Diversity & Deduplication
    const diversityStart = performance.now();
    let finalResults = rankedCandidates;
    if (useDiversity) {
      finalResults = deduplicateResults({
        results: rankedCandidates,
        corpusMap: this.corpusMap,
      });
    }
    const diversityTime = performance.now() - diversityStart;

    const totalLatency = performance.now() - startTime;

    // Map output records with snippet and metadata
    const resultsOutput = finalResults.slice(0, topK).map((item, idx) => {
      const doc = this.corpusMap.get(item.id) || {};
      return {
        rank: idx + 1,
        corpusId: item.id,
        score: Number(item.score.toFixed(6)),
        snippet: doc.text || '',
        metadata: {
          title: doc.title || '',
          language: doc.language || 'PYTHON',
          url: doc.url || '',
          hfUrl: doc.hfUrl || 'https://huggingface.co/datasets/coir/coir_apps',
          starterCode: doc.starterCode || '',
          version: doc.version || '1.0.0',
        },
      };
    });

    return {
      query: rawQueryText,
      processedQuery: queryProcessed,
      results: resultsOutput,
      latencyMs: Number(totalLatency.toFixed(2)),
      breakdownMs: {
        queryPreprocessing: Number(queryPrepTime.toFixed(2)),
        denseRetrieval: Number(denseTime.toFixed(2)),
        bm25Retrieval: Number(bm25Time.toFixed(2)),
        fusion: Number(fusionTime.toFixed(2)),
        reranking: Number(rerankTime.toFixed(2)),
        diversity: Number(diversityTime.toFixed(2)),
      },
    };
  }

  /**
   * Evaluate system over test dataset queries and qrels
   */
  async evaluateSplit(queries, qrelsMap, options = {}, maxQueries = 250) {
    const totalStartTime = performance.now();
    let totalMRR = 0;
    let totalNDCG10 = 0;
    let totalRecall10 = 0;
    let totalLatency = 0;
    let evaluatedCount = 0;

    const evalQueries = queries.filter((q) => qrelsMap[q.id] && Object.keys(qrelsMap[q.id]).length > 0);
    const subset = evalQueries.slice(0, maxQueries);

    for (let i = 0; i < subset.length; i++) {
      const qObj = subset[i];
      const targetQrels = qrelsMap[qObj.id];
      const searchRes = await this.search(qObj.text, { ...options, topK: 10 });

      const retrievedIds = searchRes.results.map((r) => r.corpusId);
      const mrr = calculateReciprocalRank(retrievedIds, targetQrels);
      const ndcg10 = calculateNDCG(retrievedIds, targetQrels, 10);
      const recall10 = calculateRecall(retrievedIds, targetQrels, 10);

      totalMRR += mrr;
      totalNDCG10 += ndcg10;
      totalRecall10 += recall10;
      totalLatency += searchRes.latencyMs;
      evaluatedCount++;

      if ((i + 1) % 50 === 0 || i + 1 === subset.length) {
        console.log(`  [Progress] Evaluated ${i + 1}/${subset.length} test queries...`);
      }
    }

    const durationSec = (performance.now() - totalStartTime) / 1000;

    return {
      queryCount: evaluatedCount,
      mrr: Number((evaluatedCount > 0 ? totalMRR / evaluatedCount : 0).toFixed(4)),
      ndcg10: Number((evaluatedCount > 0 ? totalNDCG10 / evaluatedCount : 0).toFixed(4)),
      recall10: Number((evaluatedCount > 0 ? totalRecall10 / evaluatedCount : 0).toFixed(4)),
      avgLatencyMs: Number((evaluatedCount > 0 ? totalLatency / evaluatedCount : 0).toFixed(2)),
      totalEvaluationTimeSec: Number(durationSec.toFixed(2)),
    };
  }
}

module.exports = {
  PipelineEvaluator,
};
