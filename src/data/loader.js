const fs = require('fs');
const path = require('path');
const { parquetRead } = require('hyparquet');
const config = require('../config');

const HF_DATASET_URL = 'https://huggingface.co/datasets/coir/coir_apps';

/**
 * Reads a parquet file asynchronously via hyparquet
 */
function readParquetFile(filePath) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`Parquet file not found at: ${filePath}`));
      }
      const fileBuffer = fs.readFileSync(filePath);
      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      parquetRead({
        file: arrayBuffer,
        onComplete: (data) => {
          resolve(data || []);
        },
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Load raw corpus items from corpus parquet file
 */
async function loadCorpus(customPath) {
  const filePath = customPath || path.join(config.paths.rawDataDir, 'corpus/corpus-00000-of-00001.parquet');
  const rawRows = await readParquetFile(filePath);

  return rawRows.map((row) => {
    const [id, partition, text, language, meta, title] = row;
    const problemUrl = meta?.url ? String(meta.url) : '';
    return {
      id: String(id ?? ''),
      partition: String(partition ?? 'train'),
      text: String(text ?? ''),
      language: String(language ?? 'PYTHON'),
      title: String(title ?? ''),
      url: problemUrl,
      hfUrl: HF_DATASET_URL, // Hugging Face dataset source link
      starterCode: meta?.starter_code ? String(meta.starter_code) : '',
      version: '1.0.0', // Version metadata for version-aware retrieval (P1 goal)
    };
  });
}

/**
 * Load queries from queries parquet file
 */
async function loadQueries(customPath) {
  const filePath = customPath || path.join(config.paths.rawDataDir, 'queries/queries-00000-of-00001.parquet');
  const rawRows = await readParquetFile(filePath);

  return rawRows.map((row) => {
    const [id, partition, text, language, meta, title] = row;
    return {
      id: String(id ?? ''),
      partition: String(partition ?? 'train'),
      text: String(text ?? ''),
      language: String(language ?? 'PYTHON'),
      title: String(title ?? ''),
      url: meta?.url ? String(meta.url) : '',
      hfUrl: HF_DATASET_URL,
    };
  });
}

/**
 * Load relevance judgments (qrels) from train/test parquet files
 */
async function loadQrels(split = 'test', customPath) {
  const fileName = split === 'train' ? 'train-00000-of-00001.parquet' : 'test-00000-of-00001.parquet';
  const filePath = customPath || path.join(config.paths.rawDataDir, 'data', fileName);
  const rawRows = await readParquetFile(filePath);

  const qrelsMap = {}; // queryId -> { corpusId: score }
  const pairs = [];

  for (const row of rawRows) {
    const [queryId, corpusId, rawScore] = row;
    const qId = String(queryId ?? '');
    const cId = String(corpusId ?? '');
    const score = Number(rawScore ?? 1);

    if (!qrelsMap[qId]) {
      qrelsMap[qId] = {};
    }
    qrelsMap[qId][cId] = score;
    pairs.push({ queryId: qId, corpusId: cId, score });
  }

  return { qrelsMap, pairs };
}

module.exports = {
  loadCorpus,
  loadQueries,
  loadQrels,
  readParquetFile,
  HF_DATASET_URL,
};
