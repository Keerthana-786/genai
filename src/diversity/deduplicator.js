const config = require('../config');
const { tokenize } = require('../preprocessing/text');

/**
 * Calculate Jaccard similarity between two token sets
 */
function jaccardSimilarity(tokensA, tokensB) {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Filter out duplicate / near-duplicate code snippets from candidate list
 */
function deduplicateResults({
  results = [],
  corpusMap,
  threshold = config.diversity.duplicateThreshold,
  enabled = config.diversity.enabled,
}) {
  if (!enabled || !results || results.length <= 1) return results;

  const filtered = [];

  for (const item of results) {
    const doc = corpusMap.get(item.id);
    if (!doc) {
      filtered.push(item);
      continue;
    }

    const currentTokens = doc.searchableTerms || tokenize(doc.text);

    let isDuplicate = false;
    for (const keptItem of filtered) {
      const keptDoc = corpusMap.get(keptItem.id);
      if (!keptDoc) continue;

      const keptTokens = keptDoc.searchableTerms || tokenize(keptDoc.text);
      const sim = jaccardSimilarity(currentTokens, keptTokens);

      if (sim >= threshold) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      filtered.push(item);
    }
  }

  return filtered;
}

module.exports = {
  deduplicateResults,
  jaccardSimilarity,
};
