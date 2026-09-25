import { tokenize } from '../preprocessing/text.js';

export class BM25 {
  constructor(documents, { k1 = 1.2, b = 0.75 } = {}) {
    this.documents = documents;
    this.k1 = k1;
    this.b = b;
    this.avgLength = documents.reduce((sum, doc) => sum + doc.terms.length, 0) / Math.max(1, documents.length);
    this.docFrequency = new Map();
    for (const doc of documents) for (const term of new Set(doc.terms)) this.docFrequency.set(term, (this.docFrequency.get(term) || 0) + 1);
  }

  search(query, limit = 100) {
    const terms = tokenize(query);
    const scores = this.documents.map((doc) => {
      const counts = new Map();
      for (const term of doc.terms) counts.set(term, (counts.get(term) || 0) + 1);
      const score = terms.reduce((sum, term) => {
        const frequency = counts.get(term) || 0;
        if (!frequency) return sum;
        const df = this.docFrequency.get(term) || 0;
        const idf = Math.log(1 + (this.documents.length - df + 0.5) / (df + 0.5));
        return sum + idf * (frequency * (this.k1 + 1)) / (frequency + this.k1 * (1 - this.b + this.b * doc.terms.length / this.avgLength));
      }, 0);
      return { id: doc.id, score };
    });
    return scores.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  }
}