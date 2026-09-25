const fs = require('fs');
const path = require('path');
const config = require('../config');

class EmbeddingCache {
  constructor(cacheDir = config.paths.embeddingsDir) {
    this.cacheDir = cacheDir;
    this.cacheFile = path.join(cacheDir, 'corpus_embeddings.json');
    this.cacheMap = new Map(); // corpusId -> Array<number>
  }

  ensureDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  load() {
    if (fs.existsSync(this.cacheFile)) {
      try {
        const raw = fs.readFileSync(this.cacheFile, 'utf8');
        const data = JSON.parse(raw);
        this.cacheMap = new Map(Object.entries(data));
        return true;
      } catch (err) {
        console.warn('Failed to load embedding cache from disk:', err.message);
      }
    }
    return false;
  }

  save() {
    this.ensureDir();
    const obj = {};
    for (const [id, vec] of this.cacheMap.entries()) {
      obj[id] = vec;
    }
    fs.writeFileSync(this.cacheFile, JSON.stringify(obj), 'utf8');
  }

  get(id) {
    return this.cacheMap.get(id);
  }

  set(id, vector) {
    this.cacheMap.set(id, vector);
  }

  has(id) {
    return this.cacheMap.has(id);
  }

  size() {
    return this.cacheMap.size;
  }

  getAll() {
    return this.cacheMap;
  }
}

const embeddingCache = new EmbeddingCache();

module.exports = {
  EmbeddingCache,
  embeddingCache,
};
