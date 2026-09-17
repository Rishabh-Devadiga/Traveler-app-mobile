/**
 * Centralized mock content pools for deterministic itinerary generation (Phase 2).
 * Generic templates only — the destination name is interpolated at generation time,
 * so no destination-specific itineraries live in components.
 */

export const mockDayThemes = [
  'Arrival & First Light',
  'Old Lanes & Local Markets',
  'Viewpoints & Slow Afternoon',
  'Crafts, Cafes & Culture',
  'Nature Loop & Sunset',
  'Hidden Corners & Farewell',
  'Lakeside Mornings & Bazaars',
];

export interface MockStopTemplate {
  time: string;
  title: string;
  description: string;
  tags: string[];
  featured?: boolean;
  badge?: string;
}

export const mockMorningStays: MockStopTemplate[] = [
  {
    time: '09:00 AM',
    title: 'Check in — MOCK riverside stay',
    description: 'MOCK placeholder stay near the centre. Real partner stays arrive with the backend.',
    tags: ['Stay', 'MOCK'],
    badge: 'MOCK',
  },
  {
    time: '09:00 AM',
    title: 'Breakfast — MOCK lakeside cafe',
    description: 'MOCK placeholder breakfast stop. Real menus and prices arrive with the backend.',
    tags: ['Food', 'MOCK'],
    badge: 'MOCK',
  },
];

export const mockExperienceStops: MockStopTemplate[] = [
  {
    time: '10:30 AM',
    title: 'Old {destination} walking trail',
    description: 'Guided lanes, viewpoints and photo stops at an easy pace.',
    tags: ['Sightseeing', '2 hrs'],
    featured: true,
    badge: 'AI Highlight',
  },
  {
    time: '01:00 PM',
    title: 'Local {destination} food crawl',
    description: 'MOCK placeholder food stops. Vegetarian-friendly options assumed.',
    tags: ['Food', 'MOCK'],
    badge: 'MOCK',
  },
  {
    time: '03:30 PM',
    title: '{destination} craft & market hour',
    description: 'Bazaars and artisan shops. MOCK placeholder — real listings arrive later.',
    tags: ['Shopping', 'MOCK'],
    badge: 'MOCK',
  },
  {
    time: '05:30 PM',
    title: 'Sunset point over {destination}',
    description: 'Golden-hour viewpoint. Timings are mock estimates, not live data.',
    tags: ['Sunset', '45 mins'],
  },
  {
    time: '07:30 PM',
    title: 'Evening folk performance & dinner',
    description: 'MOCK placeholder evening plan. Real events and booking arrive with the backend.',
    tags: ['Dinner', 'MOCK'],
    badge: 'MOCK',
  },
];

export const mockTransportStops: MockStopTemplate[] = [
  {
    time: '08:30 AM',
    title: 'Local cab & walk transfers — MOCK',
    description: 'MOCK placeholder transfers for the day. Real routes and fares arrive with maps.',
    tags: ['Transport', 'MOCK'],
    badge: 'MOCK',
  },
];

export const mockDaySlots = ['morning', 'midday', 'afternoon', 'sunset', 'evening'] as const;
