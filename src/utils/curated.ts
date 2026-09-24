import type { Destination } from '../types';
import { exploreGridCategories, filterCategories } from '../mocks/traveler';

/** Home filter category ids. Mirrors the `filterCategories` mock ids. */
export type CuratedCategoryId =
  | 'all'
  | 'popular'
  | 'heritage'
  | 'beach'
  | 'mountain'
  | 'foodie'
  | 'nature'
  | 'adventure'
  | 'wellness'
  | 'lakes';

export interface CuratedCategoryMeta {
  id: string;
  /** Label shown on the Home filter pill (matches `filterCategories`). */
  label: string;
  /** Title shown on the dedicated /curated page and Layout header. */
  title: string;
  /** Subtitle shown on the dedicated /curated page and Layout header. */
  subtitle: string;
}

const CATEGORY_COPY: Record<string, { title: string; subtitle: string }> = {
  all: {
    title: 'Curated For You',
    subtitle: 'Explore destinations picked for your next journey',
  },
  popular: {
    title: 'Popular',
    subtitle: 'Explore our most loved destinations',
  },
  heritage: {
    title: 'Heritage',
    subtitle: 'Explore heritage destinations for your next journey',
  },
  beach: {
    title: 'Beach & Sun',
    subtitle: 'Explore beach and coastal destinations',
  },
  mountain: {
    title: 'Mountain Escape',
    subtitle: 'Discover mountain destinations for your next journey',
  },
  foodie: {
    title: 'Foodie',
    subtitle: 'Explore food destinations for your next journey',
  },
  nature: {
    title: 'Nature',
    subtitle: 'Explore wildlife and nature retreats',
  },
  adventure: {
    title: 'Adventure',
    subtitle: 'Discover thrilling outdoor adventures',
  },
  wellness: {
    title: 'Wellness',
    subtitle: 'Find peaceful wellness retreats',
  },
  lakes: {
    title: 'Lakes',
    subtitle: 'Explore serene lakes and waterfront escapes',
  },
};

/**
 * Maps Explore-grid ids (Home "Explore Categories" section) to the internal
 * filter ids used by `/curated?category=`. Display labels and internal
 * values are deliberately not assumed identical.
 */
const EXPLORE_CATEGORY_ALIAS: Record<string, string> = {
  heritage: 'heritage',
  beaches: 'beach',
  mountains: 'mountain',
  food: 'foodie',
  lakes: 'lakes',
};

/** Resolve an Explore-grid id to its internal filter category id. */
export function resolveExploreCategory(exploreId: string): string {
  const id = exploreId.trim().toLowerCase();
  return EXPLORE_CATEGORY_ALIAS[id] ?? id;
}

/**
 * Metadata for every category page. Labels come from the existing
 * `filterCategories` mock (falling back to `exploreGridCategories` for
 * grid-only ids like `lakes`) so pills, grid and pages never drift apart.
 */
export function getCuratedCategory(categoryId: string): CuratedCategoryMeta {
  const normalized = normalizeCuratedCategory(categoryId);
  const match =
    filterCategories.find((c) => c.id === normalized) ??
    exploreGridCategories.find((c) => c.id === normalized) ??
    exploreGridCategories.find((c) => resolveExploreCategory(c.id) === normalized);
  const label = match?.label ?? 'All';
  const copy = CATEGORY_COPY[normalized] ?? CATEGORY_COPY.all;
  return { id: normalized, label, title: copy.title, subtitle: copy.subtitle };
}

/** Normalize a raw `?category=` value to a known filter id (defaults to `all`). */
export function normalizeCuratedCategory(raw: string | null | undefined): string {
  if (!raw) return 'all';
  const id = resolveExploreCategory(raw.trim());
  if (filterCategories.some((c) => c.id === id)) return id;
  if (id === 'lakes') return 'lakes';
  return 'all';
}

function haystack(d: Destination): string {
  return `${d.name} ${d.region} ${d.imageAlt}`.toLowerCase();
}

function ratingOf(d: Destination): number {
  if (!d.rating) return 0;
  const value = Number.parseFloat(d.rating);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Filter curated destinations by Home category.
 *
 * Data-driven first: entries with explicit `categories` match exactly.
 * Legacy fallback: entries without `categories` keep working via the
 * original name/region text matching, so older data never breaks.
 * Nothing is invented — categories with no genuine matches return [] and
 * the UI shows an empty state.
 */
export function filterCuratedByCategory(
  destinations: Destination[],
  categoryId: string,
): Destination[] {
  if (categoryId === 'all') return destinations;
  if (categoryId === 'popular') {
    // Explicit editorial flag first; entries without the flag fall back to
    // the original rating threshold so legacy data keeps working.
    return destinations
      .filter((d) =>
        d.isPopular === true || (d.isPopular === undefined && ratingOf(d) >= 4.8),
      )
      .sort((a, b) => ratingOf(b) - ratingOf(a));
  }
  const legacy = legacyMatch(categoryId);
  return destinations.filter((d) => {
    if (d.categories && categoryId !== 'lakes') return d.categories.includes(categoryId);
    // 'lakes' is grid-only metadata matched via sub-themes/text (no
    // destination carries an explicit 'lakes' category id).
    if (categoryId === 'lakes') {
      return (d.categories?.includes('lakes') ?? false) || matchesLakes(d);
    }
    return legacy(d);
  });
}

/** Genuine lake signals: lake sub-themes or lake/backwater mentions. */
function matchesLakes(d: Destination): boolean {
  if ((d.subThemes ?? []).some((t) => /lake/i.test(t))) return true;
  return /lake|backwater/i.test(haystack(d));
}

/** Original text-matching rules, kept as fallback for entries without `categories`. */
function legacyMatch(categoryId: string): (d: Destination) => boolean {
  switch (categoryId) {
    case 'heritage':
      return (d) =>
        /udaipur|jaipur|jaisalmer|heritage|palace|fort|lake|rajasthan|taj|temple|old city/i.test(
          haystack(d),
        );
    case 'beach':
      return (d) =>
        /beach|goa|coast|island|andaman/i.test(haystack(d));
    case 'mountain':
      return (d) =>
        /mountain|manali|valley|himalaya|ladakh|shimla|nainital|mussoorie|uttarakhand/i.test(
          haystack(d),
        );
    case 'foodie':
      return (d) => /food|cuisin|cafe|thali/i.test(haystack(d));
    case 'lakes':
      return (d) => matchesLakes(d);
    default:
      // Unknown future categories: only explicit metadata matches.
      return (d) => d.categories?.includes(categoryId) ?? false;
  }
}
