/**
 * Runs the low-budget assessment checks without a test framework.
 *
 * The repo has no test runner (package.json scripts: dev/build/lint/preview
 * only), so this script type-strips the two check sources with the TypeScript
 * compiler API already present in node_modules, stages them in a temp folder
 * that mirrors their real relative layout (so imports resolve unchanged),
 * runs the checks, and reports pass/fail. No build artifacts are left behind
 * and `src/` is never written to. Exits non-zero when any check fails.
 *
 * Run: node scripts/check-budget-assessment.mjs
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(`${process.cwd()}/package.json`);
const ts = require('typescript');

/** Source path → staged path, preserving relative offsets so imports resolve. */
const FILES = [
  { source: 'src/utils/budgetAssessment.ts', staged: 'src/utils/budgetAssessment.js' },
  {
    source: 'src/utils/__checks__/budgetAssessment.check.ts',
    staged: 'src/utils/__checks__/budgetAssessment.check.js',
  },
];

const EXPECTED_MARKERS = {
  'src/utils/budgetAssessment.ts': 'export function assessBudget',
  'src/utils/__checks__/budgetAssessment.check.ts': 'export function runBudgetAssessmentChecks',
};

function stripTypes(sourcePath) {
  const source = readFileSync(sourcePath, 'utf8');
  if (!source.includes(EXPECTED_MARKERS[sourcePath])) {
    throw new Error(`unexpected source at ${sourcePath} — refusing to run`);
  }
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: 'module.ts',
  }).outputText;
  // Guard: a leftover `export` keyword means the file is corrupt (e.g. a
  // truncated function body swallowing later code). Fail loudly rather than
  // running something that tests different code than what ships.
  const leftover = transpiled
    .split('\n')
    .find((line) => /(^|[^A-Za-z_$])export\s+(default|function|const|let|var|class|interface|type|\{|\*)/.test(line));
  if (leftover) {
    throw new Error(`transpiled ${sourcePath} still contains ESM syntax: ${leftover.trim().slice(0, 120)}`);
  }
  return transpiled;
}

const temp = mkdtempSync(join(tmpdir(), 'budget-check-'));
try {
  // Temp folder has no package.json, so Node treats the .js files as CJS;
  // add an explicit one so the intent is unambiguous across Node versions.
  writeFileSync(join(temp, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2));
  for (const file of FILES) {
    const target = join(temp, file.staged);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, stripTypes(file.source));
  }

  const checkPath = join(temp, 'src/utils/__checks__/budgetAssessment.check.js');
  const { runBudgetAssessmentChecks } = require(checkPath);
  if (typeof runBudgetAssessmentChecks !== 'function') {
    throw new Error('check module did not export runBudgetAssessmentChecks');
  }

  const results = runBudgetAssessmentChecks();
  let failed = 0;
  for (const result of results) {
    if (result.passed) {
      console.log(`ok - ${result.name}`);
    } else {
      failed += 1;
      console.log(`FAIL - ${result.name}: ${result.detail ?? 'failed'}`);
    }
  }
  console.log(`${results.length - failed}/${results.length} budget assessment checks passed`);
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  rmSync(temp, { recursive: true, force: true });
}
