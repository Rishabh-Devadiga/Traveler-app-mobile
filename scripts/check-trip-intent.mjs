/**
 * Runs the trip-intent checks without a test framework.
 * Mirrors scripts/check-budget-assessment.mjs: type-strips sources with the
 * TypeScript compiler API already in node_modules, stages them preserving
 * relative layout so imports resolve, runs checks, reports pass/fail.
 * Run: node scripts/check-trip-intent.mjs
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const ts = require('typescript');

const FILES = [
  { source: 'src/utils/format.ts', staged: 'src/utils/format.js' },
  { source: 'src/data/destinations.ts', staged: 'src/data/destinations.js' },
  { source: 'src/mocks/traveler.ts', staged: 'src/mocks/traveler.js' },
  { source: 'src/utils/destinationCatalog.ts', staged: 'src/utils/destinationCatalog.js' },
  { source: 'src/utils/parseTripPrompt.ts', staged: 'src/utils/parseTripPrompt.js' },
  {
    source: 'src/utils/__checks__/tripIntent.check.ts',
    staged: 'src/utils/__checks__/tripIntent.check.js',
  },
];

const EXPECTED_MARKERS = {
  'src/utils/parseTripPrompt.ts': 'export function parseTripPrompt',
  'src/utils/__checks__/tripIntent.check.ts': 'export function runTripIntentChecks',
};

function stripTypes(sourcePath) {
  const source = readFileSync(sourcePath, 'utf8');
  if (!source.includes(EXPECTED_MARKERS[sourcePath] ?? 'export')) {
    throw new Error(`unexpected source at ${sourcePath} — refusing to run`);
  }
  let text = source;
  if (sourcePath === 'src/mocks/traveler.ts') {
    // Drop the multi-line `import type {...} from '../types'` block (the
    // line-stripper would leave a stray `;`), then strip asset imports and
    // stub every imported asset identifier so the staged module evaluates
    // without image files.
    text = text.replace(/import\s+type\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?/gs, '');
    const assetIds = new Set();
    for (const m of text.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from\s*['"][^'"]*assets[^'"]*['"]/g)) {
      assetIds.add(m[1]);
    }
    text = text.replace(/^\s*import\s+[A-Za-z_$][\w$]*\s+from\s*['"][^'"]*['"];?\s*$/gm, '');
    if (assetIds.size > 0) {
      text = `const ${[...assetIds].join(' = "", ')} = "";\n${text}`;
    }
  }
  if (sourcePath === 'src/data/destinations.ts') {
    text = text.replace(/^\s*import type .*$/m, 'const __GlobeDestination = null;');
  }
  const transpiled = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: 'module.ts',
  }).outputText;
  const leftover = transpiled
    .split('\n')
    .find((line) => /(^|[^A-Za-z_$])export\s+(default|function|const|let|var|class|interface|type|\{|\*)/.test(line));
  if (leftover) {
    throw new Error(`transpiled ${sourcePath} still contains ESM syntax: ${leftover.trim().slice(0, 120)}`);
  }
  return transpiled;
}

const temp = mkdtempSync(join(tmpdir(), 'intent-check-'));
try {
  writeFileSync(join(temp, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2));
  for (const file of FILES) {
    const target = join(temp, file.staged);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, stripTypes(file.source));
  }

  const checkPath = join(temp, 'src/utils/__checks__/tripIntent.check.js');
  const { runTripIntentChecks } = require(checkPath);
  if (typeof runTripIntentChecks !== 'function') {
    throw new Error('check module did not export runTripIntentChecks');
  }

  const results = runTripIntentChecks();
  let failed = 0;
  for (const result of results) {
    if (result.passed) {
      console.log(`ok - ${result.name}`);
    } else {
      failed += 1;
      console.log(`FAIL - ${result.name}: ${result.detail ?? 'failed'}`);
    }
  }
  console.log(`${results.length - failed}/${results.length} trip intent checks passed`);
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}

