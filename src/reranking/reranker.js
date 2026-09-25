const config = require('../config');

/**
 * Stage 7: Multi-Signal Reranker for Candidate Pool
 */
class FeatureReranker {
  constructor(options = {}) {
    this.exactMatchBonus = options.exactMatchBonus || config.reranker.exactMatchBonus;
    this.identifierCoverageWeight = options.identifierCoverageWeight || config.reranker.identifierCoverageWeight;
    this.structureMatchBonus = options.structureMatchBonus || config.reranker.structureMatchBonus;
  }

  /**
   * Rerank a candidate pool of document records using feature signals
   */
  rerank({
    queryProcessed,
    candidates, // Array of { id, score }
    corpusMap,  // Map of docId -> docRecord
    denseScoreMap, // Map of docId -> denseScore
    bm25ScoreMap,  // Map of docId -> bm25Score
  }) {
    if (!candidates || candidates.length === 0) return [];

    const queryKeywords = queryProcessed.keywords || [];
    const queryConcepts = queryProcessed.concepts || [];
    const queryIntent = queryProcessed.intent || 'GENERAL';

    const reranked = candidates.map((cand) => {
      const doc = corpusMap.get(cand.id);
      if (!doc) return cand;

      const denseScore = denseScoreMap?.get(cand.id) || 0;
      const bm25Score = bm25ScoreMap?.get(cand.id) || 0;

      // Signal 1: Exact keyword coverage ratio
      let keywordHits = 0;
      const docTextLower = (doc.searchableText || doc.text || '').toLowerCase();
      const searchableTerms = doc.searchableTerms || [];

      for (const kw of queryKeywords) {
        if (docTextLower.includes(kw) || searchableTerms.includes(kw)) {
          keywordHits++;
        }
      }
      const keywordCoverage = queryKeywords.length > 0 ? keywordHits / queryKeywords.length : 0;

      // Signal 2: Function/Class/Import identifier match bonus
      let identifierHits = 0;
      const functionNames = doc.functionNames || doc.structures?.functions || [];
      const classNames = doc.classNames || doc.structures?.classes || [];
      const allIdentifiers = [...functionNames, ...classNames].map((name) => name.toLowerCase());

      for (const kw of queryKeywords) {
        if (allIdentifiers.some((id) => id.includes(kw))) {
          identifierHits++;
        }
      }
      const identifierMatchScore = queryKeywords.length > 0 ? identifierHits / queryKeywords.length : 0;

      // Signal 3: Concept / Intent structural alignment
      let conceptBonus = 0;
      if (queryIntent === 'PREPROCESSING' && (docTextLower.includes('input') || docTextLower.includes('preprocess') || docTextLower.includes('parse'))) {
        conceptBonus = this.structureMatchBonus;
      } else if (queryIntent === 'SORTING' && (docTextLower.includes('sort') || docTextLower.includes('sorted'))) {
        conceptBonus = this.structureMatchBonus;
      } else if (queryIntent === 'STRING_MANIPULATION' && (docTextLower.includes('reverse') || docTextLower.includes('binary') || docTextLower.includes('string'))) {
        conceptBonus = this.structureMatchBonus;
      }

      // Signal 4: Comment / Docstring relevance
      const comments = doc.structures?.comments || [];
      let commentBonus = 0;
      if (comments.length > 0) {
        const commentText = comments.join(' ').toLowerCase();
        for (const kw of queryKeywords) {
          if (commentText.includes(kw)) {
            commentBonus += 0.05;
          }
        }
      }

      // Feature-weighted Rerank Score Formula
      const rerankScore =
        cand.score +
        keywordCoverage * this.identifierCoverageWeight +
        identifierMatchScore * this.exactMatchBonus +
        conceptBonus +
        Math.min(0.1, commentBonus);

      return {
        ...cand,
        baseScore: cand.score,
        denseScore,
        bm25Score,
        score: rerankScore,
        features: {
          keywordCoverage,
          identifierMatchScore,
          conceptBonus,
          commentBonus,
        },
      };
    });

    reranked.sort((a, b) => b.score - a.score);
    return reranked;
  }
}

module.exports = {
  FeatureReranker,
};
