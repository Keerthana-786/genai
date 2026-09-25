const { tokenize, removeStopWords } = require('../text');

/**
 * Extract structured code tokens: functions, classes, imports, variables
 */
function extractCodeStructures(codeText) {
  if (!codeText || typeof codeText !== 'string') {
    return { functions: [], classes: [], imports: [], comments: [] };
  }

  const functions = [];
  const classes = [];
  const imports = [];
  const comments = [];

  const lines = codeText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // Extract comments
    if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      comments.push(trimmed.replace(/^([#/]|[*])+\s*/, ''));
      continue;
    }

    // Python / JS function definitions
    const fnMatch = trimmed.match(/(?:def|function)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (fnMatch) {
      functions.push(fnMatch[1]);
    }

    // Class definitions
    const classMatch = trimmed.match(/class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (classMatch) {
      classes.push(classMatch[1]);
    }

    // Imports
    const importMatch = trimmed.match(/(?:import|from)\s+([a-zA-Z_][a-zA-Z0-9_.]*)/);
    if (importMatch) {
      imports.push(importMatch[1]);
    }
  }

  return { functions, classes, imports, comments };
}

/**
 * Stage 2: Code Preprocessing
 * Process a code snippet or record into normalized searchable representations
 */
function preprocessCode(codeRecord) {
  const text = typeof codeRecord === 'string' ? codeRecord : (codeRecord.text || '');
  const title = codeRecord.title || '';
  const starterCode = codeRecord.starterCode || '';

  // Combined text payload
  const combinedText = [title, text, starterCode].filter(Boolean).join('\n');

  // Extract structural features
  const structures = extractCodeStructures(combinedText);

  // Tokenize full payload
  const allTokens = tokenize(combinedText);
  const searchableTerms = removeStopWords(allTokens);

  // Normalized searchable text representation for dense embedding
  const searchableText = `${title}\n${text}`.replace(/\s+/g, ' ').trim();

  return {
    ... (typeof codeRecord === 'object' ? codeRecord : {}),
    searchableText,
    searchableTerms,
    structures,
    functionNames: structures.functions,
    classNames: structures.classes,
    importNames: structures.imports,
  };
}

module.exports = {
  preprocessCode,
  extractCodeStructures,
};
