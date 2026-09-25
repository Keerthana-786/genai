import fs from 'node:fs/promises';
import path from 'node:path';
import parquet from 'parquetjs-lite';

async function readParquet(filePath) {
  const reader = await parquet.ParquetReader.openFile(filePath);
  const cursor = reader.getCursor();
  const rows = [];
  let row;
  while ((row = await cursor.next())) rows.push(row);
  await reader.close();
  return rows;
}

export async function loadCoirApps(rawDataDir) {
  const [corpus, queries, testQrels, trainQrels] = await Promise.all([
    readParquet(path.join(rawDataDir, 'corpus/corpus-00000-of-00001.parquet')),
    readParquet(path.join(rawDataDir, 'queries/queries-00000-of-00001.parquet')),
    readParquet(path.join(rawDataDir, 'data/test-00000-of-00001.parquet')),
    readParquet(path.join(rawDataDir, 'data/train-00000-of-00001.parquet'))
  ]);
  return { corpus, queries, testQrels, trainQrels };
}

export function normalizeRecord(record) {
  return {
    id: String(record._id ?? record.id ?? record['corpus-id'] ?? record['query-id']),
    text: String(record.text ?? ''),
    title: String(record.title ?? ''),
    language: String(record.language ?? ''),
    partition: String(record.partition ?? ''),
    meta: record.meta_information ?? {}
  };
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value));
}