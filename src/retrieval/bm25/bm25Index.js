const config = require('../../config');
const { tokenize, removeStopWords } = require('../../preprocessing/text');

class BM25Index {
  constructor(k1 = config.bm25.k1, b = config.bm25.b) {
    this.k1 = k1;
    this.b = b;
    this.docCount = 0;
    this.avgDocLength = 0;
    this.docLengths = new Map(); // docId -> number
    this.invertedIndex = new Map(); // term -> Map(docId -> termFreq)
    this.idfs = new Map(); // term -> idf
    this.documents = new Map(); // docId -> docRecord
  }

  /**
   * Build BM25 index over processed corpus documents
   */
  build(corpusDocs) {
    this.docCount = corpusDocs.length;
    this.docLengths.clear();
    this.invertedIndex.clear();
    this.idfs.clear();
    this.documents.clear();

    let totalLength = 0;

    for (const doc of corpusDocs) {
      const docId = doc.id;
      this.documents.set(docId, doc);

      // Use preprocessed searchable terms or extract from searchableText
      const terms = doc.searchableTerms || removeStopWords(tokenize(doc.searchableText || doc.text));
      const docLength = terms.length || 1;
      this.docLengths.set(docId, docLength);
      totalLength += docLength;

      // Count term frequencies
      const termCounts = new Map();
      for (const term of terms) {
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }

      // Add to inverted index
      for (const [term, freq] of termCounts.entries()) {
        if (!this.invertedIndex.has(term)) {
          this.invertedIndex.set(term, new Map());
        }
        this.invertedIndex.get(term).set(docId, freq);
      }
    }

    this.avgDocLength = this.docCount > 0 ? totalLength / this.docCount : 1;

    // Precalculate IDFs: IDF = ln(1 + (N - df + 0.5) / (df + 0.5))
    const N = this.docCount;
    for (const [term, postings] of this.invertedIndex.entries()) {
      const df = postings.size;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      this.idfs.set(term, Math.max(0, idf));
    }
  }

  /**
   * Calculate BM25 score for a query against all matching documents
   */
  search(queryTerms, topK = 10) {
    if (!queryTerms || queryTerms.length === 0 || this.docCount === 0) {
      return [];
    }

    const docScores = new Map();
    const k1 = this.k1;
    const b = this.b;
    const avgdl = this.avgDocLength;

    for (const term of queryTerms) {
      const postings = this.invertedIndex.get(term);
      if (!postings) continue;

      const idf = this.idfs.get(term) || 0;

      for (const [docId, freq] of postings.entries()) {
        const docLen = this.docLengths.get(docId) || avgdl;
        
        // BM25 term score formula
        const numerator = freq * (k1 + 1);
        const denominator = freq + k1 * (1 - b + b * (docLen / avgdl));
        const score = idf * (numerator / denominator);

        docScores.set(docId, (docScores.get(docId) || 0) + score);
      }
    }

    const results = [];
    for (const [id, score] of docScores.entries()) {
      results.push({ id, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}

module.exports = {
  BM25Index,
};
