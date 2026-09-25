const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { loadCorpus, loadQueries, loadQrels } = require('../src/data/loader');
const { preprocessCode } = require('../src/preprocessing/code/codePreprocessor');

async function main() {
  console.log('=== Preparing CoIR Apps Dataset ===');
  const start = performance.now();

  const outDir = config.paths.processedDataDir;
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Load and preprocess Corpus
  console.log('1/3 Loading and preprocessing Corpus records...');
  const rawCorpus = await loadCorpus();
  console.log(`Loaded ${rawCorpus.length} corpus items from Parquet.`);

  const processedCorpus = rawCorpus.map((item, idx) => {
    if ((idx + 1) % 2000 === 0) {
      console.log(`  Processed ${idx + 1}/${rawCorpus.length} code snippets...`);
    }
    return preprocessCode(item);
  });

  const corpusOutPath = path.join(outDir, 'corpus_processed.json');
  fs.writeFileSync(corpusOutPath, JSON.stringify(processedCorpus, null, 2), 'utf8');
  console.log(`Saved processed corpus to ${corpusOutPath}`);

  // 2. Load Queries
  console.log('2/3 Loading Queries...');
  const queries = await loadQueries();
  const queriesOutPath = path.join(outDir, 'queries.json');
  fs.writeFileSync(queriesOutPath, JSON.stringify(queries, null, 2), 'utf8');
  console.log(`Saved ${queries.length} queries to ${queriesOutPath}`);

  // 3. Load Qrels
  console.log('3/3 Loading Relevance Judgments (Qrels)...');
  const testQrels = await loadQrels('test');
  const trainQrels = await loadQrels('train');

  fs.writeFileSync(
    path.join(outDir, 'qrels_test.json'),
    JSON.stringify(testQrels, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(outDir, 'qrels_train.json'),
    JSON.stringify(trainQrels, null, 2),
    'utf8'
  );

  const durationSec = ((performance.now() - start) / 1000).toFixed(2);
  console.log(`=== Dataset Preparation Complete in ${durationSec}s ===`);
}

main().catch((err) => {
  console.error('Data preparation failed:', err);
  process.exit(1);
});
