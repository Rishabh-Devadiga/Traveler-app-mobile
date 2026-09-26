/**
 * Node-runnable checks for the low-budget assessment (budgetAssessment.ts).
 *
 * Why not vitest/jest? The repo has no test runner (package.json scripts were
 * dev/build/lint/preview only; `check:budget` was added for this file alone).
 * Pending a test-framework decision, this file doubles as living documentation
 * AND an executable validator: it is written dependency-free so `node` can run
 * it against freshly type-stripped sources (see scripts/check-budget-assessment.mjs).
 *
 * Run: npm run check:budget
 */
import {
  assessBudget,
  buildBudgetReferences,
  medianPerPersonPerDay,
  parseCatalogIdealDays,
  parseCatalogPricePerPerson,
} from '../budgetAssessment';
import type { BudgetReference } from '../budgetAssessment';

export interface BudgetCheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

type Check = () => void | string;

const checks: Array<{ name: string; run: Check }> = [];

function check(name: string, run: Check): void {
  checks.push({ name, run });
}

function expectEqual(actual: unknown, expected: unknown, label: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectTrue(value: boolean, label: string): void {
  if (value !== true) throw new Error(`${label}: expected true, got ${JSON.stringify(value)}`);
}

/** Fixed synthetic references keep every scenario deterministic. */
function refs(): BudgetReference[] {
  return [
    { perPersonPerDay: 7000, sourceLabel: 'Udaipur, Rajasthan', lowFraction: 0.7 },
    { perPersonPerDay: 8000, sourceLabel: 'Goa Beaches', lowFraction: 0.7 },
  ];
}

check('parses the catalog price display format', () => {
  expectEqual(parseCatalogPricePerPerson('₹28K/person'), 28000, '28K');
  expectEqual(parseCatalogPricePerPerson('₹75,000 Total'), 75000, 'grouped');
  expectEqual(parseCatalogPricePerPerson('★ 4.9'), null, 'star rows are skipped');
});

check('parses ideal-day labels', () => {
  expectEqual(parseCatalogIdealDays('Ideal: 4 Days'), 4, '4 days');
  expectEqual(parseCatalogIdealDays('2 hrs'), null, 'non-day labels are skipped');
});

check('builds references only from usable catalog rows', () => {
  const built = buildBudgetReferences([
    { name: 'Udaipur, Rajasthan', pricePerPerson: '₹28K/person', idealDays: 'Ideal: 4 Days' },
    { name: 'Broken', pricePerPerson: '★ 4.9', idealDays: '2 hrs' },
  ]);
  expectEqual(built.length, 1, 'usable rows');
  expectEqual(built[0].perPersonPerDay, 7000, 'rate = total / ideal days');
  expectEqual(built[0].sourceLabel, 'Udaipur, Rajasthan', 'destination carried through');
});

check('medians fallback rates for unknown destinations', () => {
  expectEqual(medianPerPersonPerDay(refs()), 7500, 'median of 7000/8000');
});

check('flags a low budget for a known destination', () => {
  // Udaipur: 7000/day × 4 days × 2 travelers = 56000 reference;
  // 0.7 × 56000 = 39200 threshold.
  const low = assessBudget({
    budgetAmount: 20000,
    destination: 'Udaipur',
    durationDays: 4,
    travelers: 2,
    references: refs(),
  });
  expectTrue(low !== null && low.isLow === true, '20000 is low');
  expectEqual(low?.suggestedMinimum, 56000, 'suggested minimum');
});

check('clears the flag once the budget rises above the threshold', () => {
  const ok = assessBudget({
    budgetAmount: 60000,
    destination: 'Udaipur',
    durationDays: 4,
    travelers: 2,
    references: refs(),
  });
  expectTrue(ok !== null && ok.isLow === false, '60000 is not low');
});

check('recalculates when destination, duration or travelers change', () => {
  const base = { budgetAmount: 40000, durationDays: 4, travelers: 2, references: refs() };
  const udaipur = assessBudget({ ...base, destination: 'Udaipur' });
  const unknown = assessBudget({ ...base, destination: 'Somewhere New' });
  // Median fallback (7500/day → 60000 reference → 42000 threshold) prices
  // an unknown destination higher than Udaipur (39200 threshold).
  expectTrue(
    (udaipur?.isLow ?? true) === false && (unknown?.isLow ?? false) === true,
    'same budget flips between destinations',
  );
  const longer = assessBudget({ ...base, destination: 'Udaipur', durationDays: 8 });
  expectTrue(longer !== null && longer.isLow === true, 'longer trip re-triggers');
  const solo = assessBudget({ ...base, destination: 'Udaipur', travelers: 1 });
  expectTrue(solo !== null && solo.isLow === false, 'fewer travelers clears');
});

check('never warns without a budget or determinable duration', () => {
  expectEqual(
    assessBudget({ destination: 'Udaipur', durationDays: 4, travelers: 2, references: refs() }),
    null,
    'no budget → null',
  );
  expectEqual(
    assessBudget({ budgetAmount: 20000, destination: 'Udaipur', travelers: 2, references: refs() }),
    null,
    'no duration → null',
  );
  expectEqual(
    assessBudget({ budgetAmount: 20000, destination: 'Udaipur', durationDays: 4, references: [] }),
    null,
    'no references → null',
  );
});

export function runBudgetAssessmentChecks(): BudgetCheckResult[] {
  return checks.map(({ name, run }) => {
    try {
      const detail = run();
      return { name, passed: true, detail: typeof detail === 'string' ? detail : undefined };
    } catch (error) {
      return { name, passed: false, detail: error instanceof Error ? error.message : String(error) };
    }
  });
}
