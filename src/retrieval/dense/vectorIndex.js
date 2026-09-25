/**
 * Pure JavaScript Vector Search Index over normalized embeddings
 */
class DenseVectorIndex {
  constructor() {
    this.ids = [];
    this.vectors = []; // Array of Float32Array
    this.vectorMap = new Map();
  }

  /**
   * Build vector index from a Map of id -> float vector array
   */
  build(embeddingsMap) {
    this.ids = [];
    this.vectors = [];
    this.vectorMap = new Map();

    for (const [id, vec] of embeddingsMap.entries()) {
      if (!vec || !vec.length) continue;
      const f32 = new Float32Array(vec);
      this.ids.push(id);
      this.vectors.push(f32);
      this.vectorMap.set(id, f32);
    }
  }

  /**
   * Calculate dot product of two normalized vectors (equals cosine similarity)
   */
  static dotProduct(a, b) {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  /**
   * Search top-K nearest neighbors for a query vector
   */
  search(queryVector, topK = 10) {
    if (!queryVector || !queryVector.length || this.vectors.length === 0) {
      return [];
    }

    const qVec = new Float32Array(queryVector);
    const n = this.vectors.length;
    const scores = new Array(n);

    for (let i = 0; i < n; i++) {
      scores[i] = {
        id: this.ids[i],
        score: DenseVectorIndex.dotProduct(qVec, this.vectors[i]),
      };
    }

    // Sort descending by similarity score
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK);
  }
}

module.exports = {
  DenseVectorIndex,
};
