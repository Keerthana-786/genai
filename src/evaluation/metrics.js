/**
 * Calculate Reciprocal Rank (RR) for a single query
 * @param {Array<string>} retrievedIds Array of corpus IDs in ranked order
 * @param {Object} qrelMap Map of corpusId -> relevance score (>0 means relevant)
 */
function calculateReciprocalRank(retrievedIds, qrelMap) {
  if (!retrievedIds || !qrelMap) return 0;
  for (let i = 0; i < retrievedIds.length; i++) {
    const id = retrievedIds[i];
    const rel = qrelMap[id] || 0;
    if (rel > 0) {
      return 1 / (i + 1); // 1-based rank
    }
  }
  return 0;
}

/**
 * Calculate DCG@K (Discounted Cumulative Gain at K)
 */
function calculateDCG(retrievedIds, qrelMap, k = 10) {
  if (!retrievedIds || !qrelMap) return 0;
  let dcg = 0;
  const limit = Math.min(retrievedIds.length, k);
  for (let i = 0; i < limit; i++) {
    const id = retrievedIds[i];
    const rel = Number(qrelMap[id] || 0);
    if (rel > 0) {
      const gain = Math.pow(2, rel) - 1; // 2^rel - 1 gain formula
      const discount = Math.log2(i + 2); // log2(rank + 1) where rank is 1-based (i + 2)
      dcg += gain / discount;
    }
  }
  return dcg;
}

/**
 * Calculate IDCG@K (Ideal DCG at K)
 */
function calculateIDCG(qrelMap, k = 10) {
  if (!qrelMap) return 0;
  const gains = Object.values(qrelMap)
    .map(Number)
    .filter((rel) => rel > 0)
    .sort((a, b) => b - a);

  let idcg = 0;
  const limit = Math.min(gains.length, k);
  for (let i = 0; i < limit; i++) {
    const gain = Math.pow(2, gains[i]) - 1;
    const discount = Math.log2(i + 2);
    idcg += gain / discount;
  }
  return idcg;
}

/**
 * Calculate NDCG@K (Normalized Discounted Cumulative Gain at K)
 */
function calculateNDCG(retrievedIds, qrelMap, k = 10) {
  const dcg = calculateDCG(retrievedIds, qrelMap, k);
  const idcg = calculateIDCG(qrelMap, k);
  return idcg > 0 ? dcg / idcg : 0;
}

/**
 * Calculate Recall@K
 */
function calculateRecall(retrievedIds, qrelMap, k = 10) {
  if (!qrelMap) return 0;
  const totalRelevant = Object.values(qrelMap).filter((rel) => Number(rel) > 0).length;
  if (totalRelevant === 0) return 0;

  const limit = Math.min(retrievedIds.length, k);
  let hits = 0;
  for (let i = 0; i < limit; i++) {
    const id = retrievedIds[i];
    if (Number(qrelMap[id] || 0) > 0) {
      hits++;
    }
  }
  return hits / totalRelevant;
}

module.exports = {
  calculateReciprocalRank,
  calculateDCG,
  calculateIDCG,
  calculateNDCG,
  calculateRecall,
};
