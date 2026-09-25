const test = require('node:test');
const assert = require('node:assert/strict');

const { preprocessQuery } = require('../src/preprocessing/query/queryPreprocessor');
const { preprocessCode } = require('../src/preprocessing/code/codePreprocessor');
const { BM25Index } = require('../src/retrieval/bm25/bm25Index');
const { DenseVectorIndex } = require('../src/retrieval/dense/vectorIndex');
const { combineScores } = require('../src/retrieval/hybrid/hybridRetriever');
const { FeatureReranker } = require('../src/reranking/reranker');
const { deduplicateResults } = require('../src/diversity/deduplicator');
const { calculateReciprocalRank, calculateNDCG } = require('../src/evaluation/metrics');

test('Stage 1 - Query Preprocessing', () => {
  const query = 'How is the input preprocessed before going to the main function?';
  const result = preprocessQuery(query);

  assert.equal(result.intent, 'PREPROCESSING');
  assert.ok(result.keywords.includes('input'));
  assert.ok(result.keywords.includes('preprocessed'));
  assert.ok(result.keywords.includes('main'));
  assert.ok(result.keywords.includes('function'));
});

test('Stage 2 - Code Preprocessing', () => {
  const codeRecord = {
    id: 'd1',
    title: 'Input processing module',
    text: 'def preprocess_input(data):\n    return [x.strip() for x in data]\n\ndef main():\n    pass\n',
  };

  const processed = preprocessCode(codeRecord);
  assert.ok(processed.functionNames.includes('preprocess_input'));
  assert.ok(processed.functionNames.includes('main'));
  assert.ok(processed.searchableTerms.includes('preprocess'));
});

test('Stage 4 - BM25 Index & Search', () => {
  const docs = [
    { id: 'd1', searchableTerms: ['preprocess', 'input', 'data', 'main'] },
    { id: 'd2', searchableTerms: ['graph', 'bfs', 'shortest', 'path'] },
  ];

  const bm25 = new BM25Index();
  bm25.build(docs);

  const results = bm25.search(['preprocess', 'input'], 10);
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'd1');
});

test('Stage 3 - Dense Vector Cosine Similarity Search', () => {
  const index = new DenseVectorIndex();
  const embeddingsMap = new Map([
    ['d1', [1, 0, 0]],
    ['d2', [0, 1, 0]],
  ]);

  index.build(embeddingsMap);
  const results = index.search([1, 0, 0], 2);

  assert.equal(results[0].id, 'd1');
  assert.equal(results[0].score, 1);
});

test('Stage 5 - Hybrid Fusion', () => {
  const dense = [{ id: 'd1', score: 0.9 }, { id: 'd2', score: 0.1 }];
  const bm25 = [{ id: 'd1', score: 5.0 }, { id: 'd2', score: 1.0 }];

  const hybrid = combineScores({
    denseResults: dense,
    bm25Results: bm25,
    semanticWeight: 0.5,
    lexicalWeight: 0.5,
  });

  assert.equal(hybrid[0].id, 'd1');
});

test('Stage 7 - Feature Reranker', () => {
  const reranker = new FeatureReranker();
  const corpusMap = new Map([
    [
      'd1',
      {
        id: 'd1',
        searchableText: 'def preprocess_input(): pass',
        searchableTerms: ['def', 'preprocess', 'input'],
        functionNames: ['preprocess_input'],
      },
    ],
  ]);

  const queryProcessed = preprocessQuery('preprocess input');
  const reranked = reranker.rerank({
    queryProcessed,
    candidates: [{ id: 'd1', score: 0.5 }],
    corpusMap,
  });

  assert.ok(reranked[0].score > 0.5); // Score boosted due to exact symbol match
});

test('Stage 8 - Deduplication', () => {
  const corpusMap = new Map([
    ['d1', { id: 'd1', searchableTerms: ['def', 'foo', 'return', '1'] }],
    ['d2', { id: 'd2', searchableTerms: ['def', 'foo', 'return', '1'] }], // Duplicate of d1
    ['d3', { id: 'd3', searchableTerms: ['class', 'Graph', 'bfs'] }],
  ]);

  const results = [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }];
  const deduped = deduplicateResults({ results, corpusMap, threshold: 0.85 });

  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].id, 'd1');
  assert.equal(deduped[1].id, 'd3');
});

test('Stage 10 - Evaluation Metrics (MRR & NDCG@10)', () => {
  const retrieved = ['d2', 'd1', 'd3'];
  const qrel = { d1: 1 }; // d1 is relevant at rank 2

  const mrr = calculateReciprocalRank(retrieved, qrel);
  assert.equal(mrr, 0.5); // 1 / rank 2 = 0.5

  const ndcg = calculateNDCG(retrieved, qrel, 10);
  assert.ok(ndcg > 0 && ndcg <= 1);
});
