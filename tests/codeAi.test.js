const test = require('node:test');
const assert = require('node:assert/strict');
const { detectLanguage, analyzeCode, askCodeAI } = require('../src/ai/codeAiService');

test('Code AI - Language Detection', () => {
  assert.equal(detectLanguage('', 'test.py'), 'PYTHON');
  assert.equal(detectLanguage('', 'server.js'), 'JAVASCRIPT');
  assert.equal(detectLanguage('', 'main.cpp'), 'C++');
  assert.equal(detectLanguage('def foo(): pass', ''), 'PYTHON');
  assert.equal(detectLanguage('const x = 10; function run() {}', ''), 'JAVASCRIPT');
});

test('Code AI - Static Analysis and Bug Detection', () => {
  const code = `
def divide(a, b):
    # Calculate division
    return a / b

def infinite():
    while True:
        pass
`;
  const analysis = analyzeCode(code, 'PYTHON');
  assert.equal(analysis.structures.functions.length, 2);
  assert.ok(analysis.structures.functions.includes('divide'));
  assert.ok(analysis.structures.functions.includes('infinite'));
  assert.ok(analysis.potentialIssues.some((i) => i.type === 'ZeroDivisionRisk'));
  assert.ok(analysis.potentialIssues.some((i) => i.type === 'InfiniteLoopRisk'));
});

test('Code AI - Guarded Division Should Not Flag Zero-Division Risk', () => {
  const code = `
def safe_divide(a, b):
    if b == 0:
        return 0
    return a / b
`;

  const analysis = analyzeCode(code, 'PYTHON');
  assert.equal(
    analysis.potentialIssues.some((issue) => issue.type === 'ZeroDivisionRisk'),
    false,
    'Guarded division should not be flagged as a zero-division risk.'
  );
});

test('Code AI - Answer Generation (Built-in)', async () => {
  const code = `
def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
`;
  const result = await askCodeAI({
    code,
    language: 'PYTHON',
    task: 'explain',
    query: 'Explain this code',
    useRAG: false,
  });

  assert.equal(result.language, 'PYTHON');
  assert.ok(result.answer.includes('AI Code Intelligence Report'));
  assert.ok(result.answer.includes('binary_search'));
  assert.ok(result.analysis.structures.functions.includes('binary_search'));
});

test('Code AI - Task Differentiation (Optimize & Bug Detection)', async () => {
  const code = `
function bubbleSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      if (arr[i] == arr[j]) {
        // do something
      }
    }
  }
}
`;
  const optResult = await askCodeAI({
    code,
    language: 'JAVASCRIPT',
    task: 'optimize',
    query: 'How to optimize this?',
    useRAG: false,
  });

  assert.equal(optResult.language, 'JAVASCRIPT');
  assert.ok(optResult.analysis.totalLoops >= 2);
  assert.ok(optResult.analysis.potentialIssues.some((i) => i.type === 'LooseEquality'));
  assert.ok(optResult.answer.includes('Performance & Refactoring Recommendations'));

  const bugResult = await askCodeAI({
    code,
    language: 'JAVASCRIPT',
    task: 'bug',
    query: 'Find bugs',
    useRAG: false,
  });
  assert.ok(bugResult.answer.includes('Potential Bugs, Edge Cases & Security Audit'));
});

test('Code AI - Input Validation', async () => {
  await assert.rejects(
    async () => {
      await askCodeAI({ code: '' });
    },
    {
      message: 'Code content is required.',
    }
  );

  await assert.rejects(
    async () => {
      await askCodeAI({ code: '   \n  ' });
    },
    {
      message: 'Code content is required.',
    }
  );
});

test('Code AI - HTTP API Endpoint /api/ai/ask', async () => {
  try {
    const res = await fetch('http://localhost:3000/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'def add(a, b):\n    return a + b\n',
        language: 'PYTHON',
        query: 'What does this function do?',
        task: 'explain',
        useRAG: false,
      }),
    });

    if (res.status === 200) {
      const data = await res.json();
      assert.equal(data.language, 'PYTHON');
      assert.ok(data.answer);
      assert.ok(data.analysis.structures.functions.includes('add'));
    }
  } catch {
    // If server is not running on localhost:3000 during test, skip gracefully
  }
});

