const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'cannot', 'could', 'couldn\'t',
  'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each',
  'few', 'for', 'from', 'further',
  'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
  'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
  'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
  'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself',
  'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such',
  'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these',
  'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up',
  'very',
  'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
  'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t',
  'would', 'wouldn\'t',
  'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

// Programming terminology and control flow keywords to strictly preserve
const PROGRAMMING_KEYWORDS = new Set([
  'def', 'function', 'class', 'import', 'from', 'return', 'input', 'print', 'for', 'while', 'if', 'else', 'elif',
  'try', 'except', 'catch', 'throw', 'raise', 'async', 'await', 'int', 'str', 'float', 'list', 'dict', 'set', 'map',
  'array', 'vector', 'matrix', 'node', 'tree', 'graph', 'stack', 'queue', 'heap', 'sort', 'sorted', 'split', 'join',
  'preprocess', 'preprocessed', 'process', 'main', 'parse', 'parser', 'filter', 'index', 'slice', 'reconstruct',
  'binary', 'reverse', 'reversal', 'subsequence', 'substring', 'prefix', 'suffix', 'mod', 'modulo', 'gcd', 'lcm'
]);

/**
 * Split camelCase and snake_case identifiers into individual words
 * e.g., 'preprocessInput' -> ['preprocessInput', 'preprocess', 'input']
 * e.g., 'binary_search' -> ['binary_search', 'binary', 'search']
 */
function splitIdentifier(token) {
  const parts = [];
  parts.push(token);

  // Split camelCase
  const camelSplit = token.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  // Split snake_case and dot notation
  const words = camelSplit.split(/[_.\-\s]+/).filter((w) => w.length > 0);

  for (const word of words) {
    if (word !== token) {
      parts.push(word);
    }
  }
  return parts;
}

/**
 * Tokenize code or text preserving identifiers and code symbols
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];

  // Match identifiers, numbers, operators, or code tokens
  const rawTokens = text.match(/[a-zA-Z_][a-zA-Z0-9_]*|\d+/g) || [];
  const resultTokens = [];

  for (const token of rawTokens) {
    const lowerToken = token.toLowerCase();
    
    // Add original token if meaningful
    resultTokens.push(lowerToken);

    // Split compound identifiers
    const subParts = splitIdentifier(token);
    for (const sub of subParts) {
      if (sub !== lowerToken) {
        resultTokens.push(sub.toLowerCase());
      }
    }
  }

  return resultTokens;
}

/**
 * Filter out generic stop words, while preserving programming keywords
 */
function removeStopWords(tokens) {
  return tokens.filter((token) => {
    if (PROGRAMMING_KEYWORDS.has(token)) return true;
    return !STOP_WORDS.has(token) && token.length > 1;
  });
}

module.exports = {
  STOP_WORDS,
  PROGRAMMING_KEYWORDS,
  splitIdentifier,
  tokenize,
  removeStopWords,
};