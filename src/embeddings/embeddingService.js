const { pipeline } = require('@xenova/transformers');
const config = require('../config');

class EmbeddingService {
  constructor(modelName = config.embedding.modelName) {
    this.modelName = modelName;
    this.pipe = null;
    this.isLoading = false;
  }

  /**
   * Lazy load the transformer feature extraction pipeline
   */
  async init() {
    if (this.pipe) return this.pipe;
    if (this.isLoading) {
      while (this.isLoading) {
        await new Promise((r) => setTimeout(r, 50));
      }
      return this.pipe;
    }

    this.isLoading = true;
    try {
      this.pipe = await pipeline('feature-extraction', this.modelName);
    } finally {
      this.isLoading = false;
    }
    return this.pipe;
  }

  /**
   * Generate vector embedding for a single text query or document
   */
  async getEmbedding(text) {
    const pipe = await this.init();
    const cleanText = (text || '').trim() || 'empty';
    
    // Truncate overly long text (max 512 chars) to keep embedding generation fast on CPU
    const truncated = cleanText.length > 1024 ? cleanText.slice(0, 1024) : cleanText;
    
    const output = await pipe(truncated, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  /**
   * Generate embeddings for a batch of texts in parallel/batches
   */
  async getEmbeddingsBatch(texts, batchSize = config.embedding.batchSize, onProgress) {
    const pipe = await this.init();
    const results = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize).map((t) => {
        const clean = (t || '').trim() || 'empty';
        return clean.length > 1024 ? clean.slice(0, 1024) : clean;
      });

      const batchOutputs = await Promise.all(
        batch.map((text) => pipe(text, { pooling: 'mean', normalize: true }))
      );

      for (const output of batchOutputs) {
        results.push(Array.from(output.data));
      }

      if (onProgress) {
        onProgress(Math.min(i + batchSize, texts.length), texts.length);
      }
    }

    return results;
  }
}

// Singleton instance
const embeddingService = new EmbeddingService();

module.exports = {
  EmbeddingService,
  embeddingService,
};
