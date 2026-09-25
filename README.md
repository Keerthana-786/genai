# Agentic Code Intelligence & Retrieval System (Pure JavaScript / Node.js)

A high-performance, modular, CPU-friendly Code Retrieval System built strictly in **JavaScript / Node.js** to index, retrieve, rank, and rerank code snippets for natural language queries over the **CoIR Apps** dataset.

---

## Key Highlights

- **100% JavaScript / Node.js**: Zero Python dependencies, zero native compilation issues.
- **Multi-Stage Retrieval Architecture**: Query Preprocessing $\rightarrow$ BM25 Lexical + Dense Vector Semantic Search $\rightarrow$ Hybrid Score Fusion $\rightarrow$ Feature Reranker $\rightarrow$ Result Diversity Deduplication.
- **CPU-Friendly Dense Embeddings**: Uses `@xenova/transformers` (ONNX Runtime Node) with `Xenova/all-MiniLM-L6-v2` (384D) and disk/memory vector caching for all 8,765 corpus documents.
- **Official Information Retrieval Metrics**: Calculates **MRR** and **NDCG@10** on the CoIR Apps test split.
- **Reproducible Experimentation Framework**: Runs and records Experiments A through E with automated JSON output and benchmark tables.
- **REST API & Web UI**: Express server with `/api/search` and interactive glassmorphism web interface on `http://localhost:3000`.

---

## Core Architecture

```
                  Natural Language Query
                            │
                            ▼
     Stage 1: Query Preprocessing & Intent Detection
     (Whitespace norm, keyword extraction, concept tagging)
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
Stage 4: BM25 Lexical Search    Stage 3: Dense Vector Search
(Exact identifiers, terms)      (Cosine Sim over ONNX vectors)
            │                               │
            └───────────────┬───────────────┘
                            ▼
     Stage 5: Hybrid Rank Fusion (RRF / Weighted Min-Max)
                            │
                            ▼
     Candidate Pool Generation (Top-50 candidates)
                            │
                            ▼
     Stage 7: Multi-Feature Reranker
     (Identifier match, structural match, comment relevance)
                            │
                            ▼
     Stage 8: Result Diversity (Jaccard Token Deduplication)
                            │
                            ▼
     Final Ranked Top-K Snippets & Metadata Output
```

---

## Project Structure

```
├── data/
│   └── coir_apps/
│       ├── raw/                 # Downloaded parquet dataset files
│       ├── processed/           # Processed JSON corpus & queries
│       ├── embeddings/          # Cached Float32 dense vector index (8,765 vectors)
│       └── index/               # Index metadata
├── src/
│   ├── config/                  # Global configuration (weights, paths, models)
│   ├── data/loader.js           # Pure JS parquet loader using hyparquet
│   ├── preprocessing/
│   │   ├── query/               # Query preprocessor & intent classification
│   │   ├── code/                # Code preprocessor & symbol extraction
│   │   └── text.js              # Tokenization & stop words
│   ├── embeddings/              # @xenova/transformers ONNX embedding service & cache
│   ├── retrieval/
│   │   ├── bm25/                # Pure JS BM25 indexer & search engine
│   │   ├── dense/               # Dense vector similarity search
│   │   └── hybrid/              # Hybrid score fusion (Weighted Sum & RRF)
│   ├── reranking/               # Feature-based cross reranker
│   ├── diversity/               # Result deduplication filter
│   ├── evaluation/              # MRR, NDCG@10, and Recall@K metrics
│   └── api/server.js            # Express API server
├── public/                      # Web Demo UI (HTML, CSS, JS)
├── scripts/
│   ├── prepare-data.js          # Dataset preparation script
│   ├── build-index.js           # Dense embedding builder & cache script
│   ├── evaluate.js              # MRR & NDCG@10 test split evaluation script
│   └── benchmark.js             # Reproducible experiment runner (Experiments A-E)
├── results/experiments/         # Experiment results JSON files
├── tests/                       # Automated unit test suite
└── package.json
```

---

## Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

### Quickstart

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Prepare Dataset**:
   ```bash
   npm run prepare-data
   ```

3. **Build Vector Embeddings Index**:
   ```bash
   npm run build-index
   ```

4. **Run Automated Unit Tests**:
   ```bash
   npm test
   ```

5. **Run Evaluation (MRR & NDCG@10)**:
   ```bash
   npm run evaluate
   ```

6. **Run Experiment Benchmark Suite**:
   ```bash
   npm run benchmark
   ```

7. **Start Web UI & API Server**:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your web browser.

---

## Reproducible Experiment Results

The experiment runner (`npm run benchmark`) compares 5 retrieval pipeline configurations over the CoIR Apps test split:

| Experiment Name | MRR | NDCG@10 | Recall@10 | Latency (ms) |
| :--- | :---: | :---: | :---: | :---: |
| **Experiment A: Dense Only** | 0.0592 | 0.0710 | 0.1100 | 98.48 ms |
| **Experiment B: BM25 Only** | 0.0420 | 0.0439 | 0.0500 | 11.43 ms |
| **Experiment C: Hybrid (Dense + BM25)** | 0.0656 | 0.0712 | 0.0900 | 126.84 ms |
| **Experiment D: Hybrid + Reranking** | 0.0572 | 0.0672 | 0.1000 | 324.18 ms |
| **Experiment E: Full Multi-Stage Pipeline** *(Hybrid + Reranker + Query Preprocessing)* | **0.1103** | **0.1178** | **0.1400** | 399.41 ms |

> [!NOTE]
> Combining query preprocessing, dense semantic vector retrieval, BM25 lexical search, and multi-feature reranking delivers a **+162% boost in MRR** (0.0420 $\rightarrow$ 0.1103) and **+168% boost in NDCG@10** (0.0439 $\rightarrow$ 0.1178) over the BM25 baseline.

---

## API Specification

### `POST /api/search`
Retrieves and ranks relevant code snippets for a query.

**Request Body**:
```json
{
  "query": "How is the input preprocessed before going to the main function?",
  "topK": 10,
  "mode": "hybrid",
  "useReranker": true,
  "useDiversity": true
}
```

**Response**:
```json
{
  "query": "How is the input preprocessed before going to the main function?",
  "processedQuery": {
    "cleaned": "input preprocessed going main function",
    "intent": "PREPROCESSING",
    "keywords": ["input", "preprocessed", "going", "main", "function"]
  },
  "results": [
    {
      "rank": 1,
      "corpusId": "d846",
      "score": 0.556275,
      "snippet": "def __gcd(a, b):\n ... \nn=int(input())\nwhile n:\n n=n-1\n c,d=map(int,input().split())\n print(NumberOfSquares(c, d))",
      "metadata": {
        "title": "",
        "language": "PYTHON",
        "url": "https://www.codechef.com/COM12020/problems/CODE_00",
        "version": "1.0.0"
      }
    }
  ],
  "latencyMs": 399.41
}
```

---

## License

ISC License.
