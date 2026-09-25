const config = require('../../config');

/**
 * Min-Max normalization helper
 */
function minMaxNormalize(results) {
  if (!results || results.length === 0) return new Map();
  let max = -Infinity;
  let min = Infinity;
  for (const item of results) {
    if (item.score > max) max = item.score;
    if (item.score < min) min = item.score;
  }
  const range = max - min;
  const scoreMap = new Map();
  for (const item of results) {
    const norm = range > 0 ? (item.score - min) / range : 1.0;
    scoreMap.set(item.id, norm);
  }
  return scoreMap;
}

/**
 * Hybrid Rank Fusion and Candidate Pool Combining
 */
function combineScores({
  denseResults = [],
  bm25Results = [],
  semanticWeight = config.retrieval.semanticWeight,
  lexicalWeight = config.retrieval.lexicalWeight,
  fusionMethod = config.retrieval.fusionMethod, // 'hybrid' or 'rrf'
  rrfK = config.retrieval.rrfK,
  candidatePoolSize = config.retrieval.candidatePoolSize,
}) {
  const candidateScores = new Map(); // docId -> combinedScore

  if (fusionMethod === 'rrf') {
    // Reciprocal Rank Fusion (RRF): score = 1 / (k + rank)
    denseResults.forEach((res, rank) => {
      const rrfScore = 1.0 / (rrfK + rank + 1);
      candidateScores.set(res.id, (candidateScores.get(res.id) || 0) + semanticWeight * rrfScore);
    });
    bm25Results.forEach((res, rank) => {
      const rrfScore = 1.0 / (rrfK + rank + 1);
      candidateScores.set(res.id, (candidateScores.get(res.id) || 0) + lexicalWeight * rrfScore);
    });
  } else {
    // Weighted Linear Combination with Min-Max Normalized Scores
    const normDense = minMaxNormalize(denseResults);
    const normBM25 = minMaxNormalize(bm25Results);

    const allDocIds = new Set([...normDense.keys(), ...normBM25.keys()]);

    for (const docId of allDocIds) {
      const dScore = normDense.get(docId) || 0;
      const bScore = normBM25.get(docId) || 0;
      const combined = semanticWeight * dScore + lexicalWeight * bScore;
      candidateScores.set(docId, combined);
    }
  }

  const sortedCandidates = [];
  for (const [id, score] of candidateScores.entries()) {
    sortedCandidates.push({ id, score });
  }

  sortedCandidates.sort((a, b) => b.score - a.score);
  return sortedCandidates.slice(0, candidatePoolSize);
}

module.exports = {
  combineScores,
  minMaxNormalize,
};
