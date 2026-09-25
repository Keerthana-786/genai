const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { embeddingService } = require('../src/embeddings/embeddingService');
const { embeddingCache } = require('../src/embeddings/cache');

async function main() {
  console.log('=== Building Dense Vector Embeddings Index ===');
  const start = performance.now();

  const processedCorpusPath = path.join(config.paths.processedDataDir, 'corpus_processed.json');
  if (!fs.existsSync(processedCorpusPath)) {
    console.error('Processed corpus not found. Please run: npm run prepare-data first.');
    process.exit(1);
  }

  const corpusDocs = JSON.parse(fs.readFileSync(processedCorpusPath, 'utf8'));
  console.log(`Loaded ${corpusDocs.length} preprocessed corpus documents.`);

  // Load existing cache if available
  embeddingCache.load();
  console.log(`Current cached embeddings: ${embeddingCache.size()}`);

  const docsToEmbed = corpusDocs.filter((d) => !embeddingCache.has(d.id));
  console.log(`Documents needing embedding: ${docsToEmbed.length}`);

  if (docsToEmbed.length > 0) {
    const textsToEmbed = docsToEmbed.map((d) => d.searchableText || d.text);
    const batchSize = config.embedding.batchSize || 32;

    const embedStart = performance.now();
    await embeddingService.init();

    const vectors = await embeddingService.getEmbeddingsBatch(
      textsToEmbed,
      batchSize,
      (done, total) => {
        const pct = ((done / total) * 100).toFixed(1);
        console.log(`  Embedding progress: ${done}/${total} (${pct}%)`);
      }
    );

    for (let i = 0; i < docsToEmbed.length; i++) {
      embeddingCache.set(docsToEmbed[i].id, vectors[i]);
    }

    const embedDuration = ((performance.now() - embedStart) / 1000).toFixed(2);
    console.log(`Generated ${vectors.length} embeddings in ${embedDuration}s.`);

    console.log('Saving embeddings to disk...');
    embeddingCache.save();
  }

  const totalDuration = ((performance.now() - start) / 1000).toFixed(2);
  console.log(`=== Index Building Complete in ${totalDuration}s. Total cached vectors: ${embeddingCache.size()} ===`);
}

main().catch((err) => {
  console.error('Index building failed:', err);
  process.exit(1);
});
