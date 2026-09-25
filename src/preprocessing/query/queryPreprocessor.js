const { tokenize, removeStopWords, PROGRAMMING_KEYWORDS } = require('../text');

// Query intent concepts mapping
const INTENT_CONCEPTS = {
  PREPROCESSING: ['preprocess', 'preprocessed', 'preprocessing', 'parse', 'parser', 'input', 'clean', 'format'],
  SORTING: ['sort', 'sorted', 'sorting', 'order', 'arrange'],
  GRAPH_SEARCH: ['bfs', 'dfs', 'graph', 'tree', 'shortest', 'path', 'node', 'visited'],
  STRING_MANIPULATION: ['string', 'substring', 'palindrome', 'anagram', 'reverse', 'reversal', 'binary', 'char'],
  MATH: ['gcd', 'lcm', 'prime', 'modulo', 'mod', 'matrix', 'math', 'sum', 'product', 'factor'],
  SEARCHING: ['binary_search', 'search', 'find', 'lookup', 'index', 'query'],
  DATA_STRUCTURE: ['stack', 'queue', 'heap', 'tree', 'trie', 'set', 'map', 'hash', 'array', 'list']
};

/**
 * Stage 1: Query Preprocessing
 */
function preprocessQuery(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return {
      original: '',
      cleaned: '',
      terms: [],
      keywords: [],
      concepts: [],
      intent: 'GENERAL',
    };
  }

  // 1. Normalize whitespace
  const cleaned = rawQuery.replace(/\s+/g, ' ').trim();

  // 2. Tokenize preserving programming symbols and splitting camelCase/snake_case
  const allTokens = tokenize(cleaned);

  // 3. Remove general stop words, keeping programming keywords & domain terms
  const terms = removeStopWords(allTokens);

  // 4. Extract unique meaningful keywords
  const keywords = Array.from(new Set(terms));

  // 5. Detect intent and concepts
  const detectedConcepts = new Set();
  let primaryIntent = 'GENERAL';

  for (const [intent, conceptWords] of Object.entries(INTENT_CONCEPTS)) {
    for (const kw of keywords) {
      if (conceptWords.includes(kw)) {
        detectedConcepts.add(intent.toLowerCase());
        if (primaryIntent === 'GENERAL') {
          primaryIntent = intent;
        }
      }
    }
  }

  // 6. Formulate cleaned query representation optimized for dense embedding & BM25
  const cleanedQueryText = keywords.join(' ');

  return {
    original: rawQuery,
    cleaned: cleanedQueryText || cleaned,
    terms,
    keywords,
    concepts: Array.from(detectedConcepts),
    intent: primaryIntent,
  };
}

module.exports = {
  preprocessQuery,
  INTENT_CONCEPTS,
};
