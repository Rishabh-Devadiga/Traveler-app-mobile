import type {
  BudgetSummary,
  Category,
  ChecklistItem,
  Destination,
  InspirationTrip,
  ItineraryDay,
  ItineraryMetric,
  LoadingStep,
  OnboardingSlide,
  ProfileInfoRow,
  ProfileMenuItem,
  TravelerUser,
} from '../types';
import avatarLocal from '../assets/avatar.png';

/**
 * Centralized Phase-1 mock data.
 * Converted from the standalone Stitch HTML exports.
 * No API calls — all screens read from here via props.
 * Remote Stitch image URLs are ephemeral, so stable Unsplash
 * equivalents with the same subject matter are used.
 */

export const travelerUser: TravelerUser = {
  name: 'Aarav Patel',
  firstName: 'Aarav',
  tier: 'Traveler · Explorer Tier',
  activeTripLabel: 'Active Trip: Manali (Day 3 of 7)',
  phone: '+91 98450 23145',
  email: 'aarav.patel@example.com',
  avatarUrl: avatarLocal,
  preferences: 'Pure Veg, Mountain Scenic, Moderate Pace',
  language: 'English (IN)',
  currency: 'Indian Rupee (INR ₹)',
  appVersion: 'TourFlow v2.4',
  build: 'Build 204',
};

export const homeGreeting = {
  helloName: 'Hello, Aarav',
  searchPlaceholder: "Ask AI e.g. '4 days in Udaipur under ₹35k'...",
  quickPrompt: '3 days in Coorg with coffee plantation stay under ₹20k',
  quickPromptLabel: 'Try prompt: "Weekend in Coorg"',
};

export const filterCategories: Category[] = [
  { id: 'all', label: 'All', icon: 'explore' },
  { id: 'popular', label: 'Popular', icon: 'trending_up' },
  { id: 'heritage', label: 'Heritage', icon: 'fort' },
  { id: 'beach', label: 'Beach & Sun', icon: 'beach_access' },
  { id: 'mountain', label: 'Mountain Escape', icon: 'filter_hdr' },
  { id: 'foodie', label: 'Foodie', icon: 'restaurant' },
];

export const curatedDestinations: Destination[] = [
  {
    id: 'udaipur',
    name: 'Udaipur, Rajasthan',
    region: 'India · City of Lakes',
    pricePerPerson: '₹28K/person',
    idealDays: 'Ideal: 4 Days',
    rating: '4.9',
    reviewsLabel: '4.9 (1.2k TourFlow Reviews)',
    imageUrl:
      'https://images.unsplash.com/photo-1568495286059-9ad3f0b12de6?auto=format&fit=crop&w=800&q=60',
    imageAlt: 'Udaipur Lake Palace at sunset',
    tag: 'Top Pick',
  },
  {
    id: 'goa',
    name: 'Goa Beaches',
    region: 'India · Beach & Sun',
    pricePerPerson: '₹22K/person',
    idealDays: 'Ideal: 3 Days',
    rating: '4.8',
    reviewsLabel: '4.8 (980 TourFlow Reviews)',
    imageUrl:
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=60',
    imageAlt: 'Goa beach at sunset',
  },
  {
    id: 'manali',
    name: 'Manali Valley',
    region: 'India · Mountain Escape',
    pricePerPerson: '₹25K/person',
    idealDays: 'Ideal: 5 Days',
    rating: '4.8',
    reviewsLabel: '4.8 (1.1k TourFlow Reviews)',
    imageUrl:
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=60',
    imageAlt: 'Manali mountains',
  },
  {
    id: 'kerala',
    name: 'Kerala Backwaters',
    region: 'India · Slow Travel',
    pricePerPerson: '₹30K/person',
    idealDays: 'Ideal: 4 Days',
    rating: '4.9',
    reviewsLabel: '4.9 (860 TourFlow Reviews)',
    imageUrl:
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=60',
    imageAlt: 'Kerala backwaters houseboat',
  },
];

export const exploreGridCategories: Category[] = [
  {
    id: 'heritage',
    label: 'Heritage',
    icon: 'fort',
    imageUrl:
      'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=200&q=60',
    imageAlt: 'Taj Mahal heritage',
  },
  {
    id: 'beaches',
    label: 'Beaches',
    icon: 'beach_access',
    imageUrl:
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=200&q=60',
    imageAlt: 'Beach at sunset',
  },
  {
    id: 'mountains',
    label: 'Mountains',
    icon: 'landscape',
    imageUrl:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=200&q=60',
    imageAlt: 'Mountain peaks',
  },
  {
    id: 'food',
    label: 'Food',
    icon: 'restaurant',
    imageUrl:
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=200&q=60',
    imageAlt: 'Indian food',
  },
  {
    id: 'lakes',
    label: 'Lakes',
    icon: 'sailing',
    imageUrl:
      'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=200&q=60',
    imageAlt: 'Lake at sunset',
  },
];

export const globeDestinations = [
  { name: 'India', lat: 24.58, lon: 73.71, color: '#ff6b35' },
  { name: 'Japan', lat: 35.67, lon: 139.65, color: '#38bdf8' },
  { name: 'Europe', lat: 46.8, lon: 9.8, color: '#34d399' },
  { name: 'Bali', lat: -8.4, lon: 115.18, color: '#fbbf24' },
];

export const planJourney = {
  stepLabel: 'Step 1 of 3 · AI Conversational Planner',
  title: 'Tell me where you want to wander',
  heroLabel: 'Freeform Intent',
  listeningLabel: 'TourFlow Listening',
  textareaPlaceholder: 'Describe your dream trip — destination, days, budget…',
  detectedTags: ['Udaipur', '6 Days', '2 People', '< ₹75,000', 'Relaxed Heritage'],
  qualityNote: 'Great detail detected — budget, pace and interests captured.',
  bannerTitle: 'Verified Local Intelligence',
  bannerSubtitle: 'Lakefront havelis, palace queues and sunset boat windows checked.',
  inspirationTitle: 'Or try these prompt inspirations',
  ctaLabel: 'Plan My Journey',
};

export const inspirationTrips: InspirationTrip[] = [
  {
    id: 'goa-weekend',
    title: 'Goa Weekend Getaway',
    subtitle: 'Under ₹25,000 · Hidden beaches and cafe trails',
    prompt: 'Plan a Goa weekend getaway under ₹25,000 with hidden beaches and cafe trails.',
  },
  {
    id: 'manali-5',
    title: '5 Days in Manali Valley',
    subtitle: 'Adventure trails, paragliding and old-town cafes',
    prompt: 'Plan 5 days in Manali Valley with adventure trails, paragliding and old-town cafes.',
  },
];

export const checklistQuote =
  'Plan me a 6-day trip to Udaipur for 2 people under ₹75,000. I love heritage, local food and slow lake evenings.';

export const checklistItems: ChecklistItem[] = [
  {
    id: 'destination',
    icon: 'location_on',
    label: 'Destination',
    value: 'Udaipur, Rajasthan, India',
    hint: 'The City of Lakes · Mewar Royal Region',
  },
  {
    id: 'origin',
    icon: 'flight_takeoff',
    label: 'Starting Point',
    value: 'Mumbai (BOM)',
    hint: 'Direct flight · Chhatrapati Shivaji Maharaj Intl',
  },
  {
    id: 'travelers',
    icon: 'group',
    label: 'Travelers',
    value: '2 Adults · Couple',
    hint: 'Duo pace · Shared accommodations',
  },
  {
    id: 'dates',
    icon: 'calendar_month',
    label: 'Dates & Duration',
    value: 'Mid-October · 6 Days, 5 Nights',
    hint: 'Pleasant autumn weather',
  },
  {
    id: 'style',
    icon: 'interests',
    label: 'Travel Style',
    value: 'Relaxed Heritage & Culture',
    hint: 'Palaces, Mewari cuisine, sunset lakes',
  },
];

export const budgetSummary: BudgetSummary = {
  total: '₹75,000 Total',
  perPerson: '~₹37,500/person',
  tier: 'Comfort Heritage Tier',
  interests: 'Palaces, Mewari Cuisine, Sunset Lakes',
};

export const loadingScreen = {
  statusLabel: 'Live Generation',
  title: 'Crafting Udaipur Getaway...',
  capsule: 'Udaipur, Rajasthan · 4 Days · 2 Travelers',
  summary: '2 travelers · 4 days · Relaxed tempo & heritage focus',
  weatherNote: 'Udaipur in Oct: 28°C sunny, optimal sunset 6:15 PM',
  trivia:
    'The City Palace took nearly 400 years to complete across 22 generations of Mewar rulers.',
  editSpecsLabel: 'Edit Specs',
  cancelLabel: 'Cancel',
};

export const loadingSteps: LoadingStep[] = [
  { id: 's1', label: 'Reading your travel intent', status: 'done' },
  { id: 's2', label: 'Filtered 42 cultural sites & lake cafes', status: 'done' },
  { id: 's3', label: 'Checking 3 lakefront havelis', status: 'done' },
  { id: 's4', label: 'Sequencing days for relaxed pacing', status: 'active' },
  { id: 's5', label: 'Verifying palace queues & boat windows', status: 'pending' },
  { id: 's6', label: 'Polishing final schedule', status: 'pending' },
];

export const loadingPreviews: Destination[] = [
  {
    id: 'city-palace',
    name: 'City Palace',
    region: 'Must-visit · Heritage',
    pricePerPerson: '★ 4.9',
    idealDays: '2 hrs',
    rating: '4.9',
    reviewsLabel: 'Cultural landmark',
    imageUrl:
      'https://images.unsplash.com/photo-1568495286059-9ad3f0b12de6?auto=format&fit=crop&w=600&q=60',
    imageAlt: 'City Palace Udaipur',
  },
  {
    id: 'ambrai',
    name: 'Ambrai Ghat',
    region: 'Sunset point · Lakeside cafe',
    pricePerPerson: '★ 4.8',
    idealDays: 'Evening',
    rating: '4.8',
    reviewsLabel: 'Sunset cafe',
    imageUrl:
      'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=600&q=60',
    imageAlt: 'Ambrai sunset over the lake',
  },
];

export const itineraryHero = {
  title: 'Udaipur, Rajasthan',
  subtitle: 'Customized for Aarav & Priya · Oct 18–21',
  pacing: 'Pacing: Relaxed',
  totalEstimate: '₹32,500 Total Est.',
};

export const itineraryMetrics: ItineraryMetric[] = [
  { id: 'guests', value: '2', label: 'Guests' },
  { id: 'days', value: '4', label: 'Days' },
  { id: 'stops', value: '6', label: 'Stops' },
  { id: 'dist', value: '3.8 km', label: 'Walking' },
];

export const itineraryDays: ItineraryDay[] = [
  {
    id: 'day-1',
    day: 1,
    title: 'Palaces & Pichola',
    stopsCount: 6,
    stops: [
      {
        id: 'd1-s1',
        time: '09:30 AM',
        title: "Breakfast at Jheel's Ginger Coffee Bar",
        description: 'Lakeside breakfast to start slow before the palace crowds.',
        costLabel: '₹650 for two',
        tags: ['Food', 'Lake view'],
      },
      {
        id: 'd1-s2',
        time: '10:30 AM',
        title: 'Explore City Palace & Crystal Gallery',
        description: 'Pre-booked fast-track pass avoids a 45-minute queue.',
        costLabel: '₹700 for two',
        tags: ['Must-Visit', '2 hrs'],
        imageUrl:
          'https://images.unsplash.com/photo-1568495286059-9ad3f0b12de6?auto=format&fit=crop&w=800&q=60',
        imageAlt: 'City Palace exterior',
        featured: true,
        badge: 'AI Highlight',
      },
      {
        id: 'd1-s3',
        time: '01:00 PM',
        title: 'Lunch at Ambrai Cafe',
        description: 'Mewari thali with lake views. Vegetarian friendly.',
        costLabel: '₹1,100 for two',
        tags: ['Food'],
      },
      {
        id: 'd1-s4',
        time: '03:30 PM',
        title: 'Jagdish Temple & Old City Walk',
        description: 'Guided lanes, spice shops and miniature painting studios.',
        costLabel: 'Free walk',
        tags: ['Culture', '1.5 hrs'],
      },
      {
        id: 'd1-s5',
        time: '05:15 PM',
        title: 'Private Sunset Boat Ride to Jag Mandir',
        description: 'Sunset window 05:15 PM – 05:50 PM. Best light for photos.',
        costLabel: '₹1,600 private boat',
        tags: ['Sunset', '45 mins'],
        imageUrl:
          'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=60',
        imageAlt: 'Sunset boat to Jag Mandir',
        featured: true,
      },
      {
        id: 'd1-s6',
        time: '07:30 PM',
        title: 'Rooftop Dinner at Ambrai + Folk Dance at Bagore Ki Haveli',
        description: 'Dharohar folk performance followed by rooftop dinner.',
        costLabel: '₹2,200 for two',
        tags: ['Dinner', 'Show'],
      },
    ],
  },
  {
    id: 'day-2',
    day: 2,
    title: 'Lakes & Old Haveli Lanes',
    stopsCount: 5,
    stops: [
      {
        id: 'd2-s1',
        time: '09:00 AM',
        title: 'Fateh Sagar Promenade Walk',
        description: 'Morning loop before the heat. Filter coffee stop included.',
        costLabel: 'Free',
        tags: ['Morning', 'Lake'],
      },
      {
        id: 'd2-s2',
        time: '11:00 AM',
        title: 'Saheliyon Ki Bari Gardens',
        description: 'Courtyard fountains and lotus pools. Relaxed pace.',
        costLabel: '₹200 for two',
        tags: ['Gardens'],
      },
    ],
  },
  {
    id: 'day-3',
    day: 3,
    title: 'Crafts & Cuisine Trail',
    stopsCount: 4,
    stops: [
      {
        id: 'd3-s1',
        time: '10:00 AM',
        title: 'Miniature Painting Workshop',
        description: 'Two-hour session with a local master artist.',
        costLabel: '₹1,800 for two',
        tags: ['Hands-on'],
      },
    ],
  },
  {
    id: 'day-4',
    day: 4,
    title: 'Slow Morning & Departure',
    stopsCount: 2,
    stops: [
      {
        id: 'd4-s1',
        time: '09:30 AM',
        title: 'Brunch and Bazaar Souvenirs',
        description: 'Bapu Bazaar for textiles and spices before checkout.',
        costLabel: '₹1,500 shopping',
        tags: ['Shopping'],
      },
    ],
  },
];

export const copilotSuggestions = ['Make it cheaper', 'More adventure', 'Less walking'];

export const profileInfoRows: ProfileInfoRow[] = [
  { id: 'name', label: 'Name', value: 'Aarav Patel' },
  { id: 'phone', label: 'Phone', value: '+91 98450 23145', verified: true },
  { id: 'email', label: 'Email', value: 'aarav.patel@example.com', verified: true },
];

export const profileMenuPrimary: ProfileMenuItem[] = [
  {
    id: 'prefs',
    title: 'Travel Preferences',
    subtitle: 'Pure Veg, Mountain Scenic, Moderate Pace',
    icon: 'tune',
  },
  { id: 'lang', title: 'Language', subtitle: 'English (IN)', icon: 'language' },
  {
    id: 'currency',
    title: 'Currency',
    subtitle: 'Indian Rupee (INR ₹)',
    icon: 'currency_rupee',
  },
  { id: 'settings', title: 'Settings', subtitle: 'Notifications, privacy, sync', icon: 'settings' },
];

export const profileMenuSupport: ProfileMenuItem[] = [
  {
    id: 'help',
    title: 'Help & Support',
    subtitle: 'Concierge and trip help',
    icon: 'support_agent',
  },
  {
    id: 'about',
    title: 'About TourFlow',
    subtitle: 'TourFlow v2.4 (Build 204)',
    icon: 'info',
  },
];

/**
 * Onboarding cinematic carousel.
 * Converted from `home_explore_illustrated_india_carousel/code.html`.
 * Stitch `lh3.googleusercontent.com/aida` slide URLs are ephemeral, so
 * stable Unsplash equivalents with the same subject matter are used.
 */
export const onboardingSlides: OnboardingSlide[] = [
  {
    id: 'manali',
    name: 'Manali, HP',
    location: 'Himachal Pradesh',
    imageUrl:
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=900&q=60',
    imageAlt: 'Manali, Himachal Pradesh scenic alpine valley',
  },
  {
    id: 'goa',
    name: 'Goa Beach',
    location: 'Goa, India',
    imageUrl:
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=60',
    imageAlt: 'Goa golden beach sunset',
  },
  {
    id: 'kerala',
    name: 'Kerala Backwaters',
    location: 'Kerala, India',
    imageUrl:
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=900&q=60',
    imageAlt: 'Kerala serene backwaters with houseboat',
  },
  {
    id: 'jaisalmer',
    name: 'Jaisalmer, Rajasthan',
    location: 'Thar Desert',
    imageUrl:
      'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=900&q=60',
    imageAlt: 'Rajasthan Jaisalmer golden desert dunes',
  },
  {
    id: 'kashmir',
    name: 'Kashmir Valley',
    location: 'Srinagar, Kashmir',
    imageUrl:
      'https://images.unsplash.com/photo-1566837945700-30057527ade0?auto=format&fit=crop&w=900&q=60',
    imageAlt: 'Kashmir Dal Lake with shikara boats',
  },
  {
    id: 'ladakh',
    name: 'Ladakh',
    location: 'Leh Ladakh',
    imageUrl:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=60',
    imageAlt: 'Ladakh high altitude monastery mountains',
  },
  {
    id: 'uttarakhand',
    name: 'Uttarakhand',
    location: 'Garhwal, Himalayas',
    imageUrl:
      'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=900&q=60',
    imageAlt: 'Uttarakhand lush mountain river valley',
  },
  {
    id: 'andaman',
    name: 'Andaman Islands',
    location: 'Havelock Island',
    imageUrl:
      'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=900&q=60',
    imageAlt: 'Andaman Islands tropical beach paradise',
  },
];

export const onboardingCopy = {
  badge: 'TOURFLOW V2.4',
  eyebrow: 'MEET YOUR AI COMPANION',
  titlePrefix: 'WELCOME TO',
  titleBrand: 'TOURFLOW',
  subtitle:
    'Effortlessly plan hyper-personalized escapes across majestic peaks, serene coastlines, and hidden villages.',
  startLabel: 'Start Your Journey',
  guestLabel: 'Browse as Guest',
  signInLabel: 'Sign In',
  signInPlaceholder: 'Sign-in is coming soon (UI placeholder).',
  trustNote: 'Zero-booking fees • 100% Tailored Itineraries',
  quickTags: ['Himalayas', 'Coorg Retreat', 'Kerala'],
};

/**
 * Destination vocabulary for the deterministic prompt parser (Phase 2).
 * Labels are display names; patterns match common spellings in user prompts.
 */
export const knownDestinations: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Kashmir', pattern: /\bkashmir\b|\bsrinagar\b|\bgulmarg\b|\bpahalgam\b|\bdal lake\b/i },
  { label: 'Goa', pattern: /\bgoa\b/i },
  { label: 'Udaipur', pattern: /\budaipur\b/i },
  { label: 'Manali', pattern: /\bmanali\b/i },
  { label: 'Kerala', pattern: /\bkerala\b|\bkochi\b|\bmunnar\b|\balleppey\b|\bkovalam\b/i },
  { label: 'Jaipur', pattern: /\bjaipur\b|\bamber\b/i },
  { label: 'Jaisalmer', pattern: /\bjaisalmer\b/i },
  { label: 'Ladakh', pattern: /\bladakh\b|\bleh\b/i },
  { label: 'Coorg', pattern: /\bcoorg\b|\bkodagu\b/i },
  { label: 'Pondicherry', pattern: /\bpondicherry\b|\bpuducherry\b|\bpondi\b/i },
  { label: 'Rishikesh', pattern: /\brishikesh\b/i },
  { label: 'Varanasi', pattern: /\bvaranasi\b|\bbanaras\b/i },
  { label: 'Agra', pattern: /\bagra\b/i },
  { label: 'Delhi', pattern: /\bdelhi\b/i },
  { label: 'Mumbai', pattern: /\bmumbai\b|\bbombay\b/i },
  { label: 'Darjeeling', pattern: /\bdarjeeling\b/i },
  { label: 'Shimla', pattern: /\bshimla\b/i },
  { label: 'Ooty', pattern: /\booty\b|\budhagamandalam\b/i },
  { label: 'Hampi', pattern: /\bhampi\b/i },
  { label: 'Mysore', pattern: /\bmysore\b|\bmysuru\b/i },
  { label: 'Andaman Islands', pattern: /\bandaman\b|\bhavelock\b/i },
  { label: 'Uttarakhand', pattern: /\buttarakhand\b|\bnainital\b|\bmussoorie\b/i },
  { label: 'Thailand', pattern: /\bthailand\b|\bbangkok\b|\bphuket\b|\bkrabi\b/i },
  { label: 'Bali', pattern: /\bbali\b/i },
  { label: 'Dubai', pattern: /\bdubai\b/i },
  { label: 'Paris', pattern: /\bparis\b/i },
  { label: 'Kyoto', pattern: /\bkyoto\b/i },
];

/** Simulated planning steps for the Loading screen (frontend timing only). */
export const planningSteps = [
  { id: 'p1', label: 'Understanding your trip' },
  { id: 'p2', label: 'Building your preferences' },
  { id: 'p3', label: 'Finding experiences' },
  { id: 'p4', label: 'Planning your days' },
  { id: 'p5', label: 'Preparing your itinerary' },
];

export const loadingMockNote = {
  trivia: 'Mock preview — real local tips, prices and availability arrive with trip generation.',
  weather: 'Mock estimates only — live weather and prices arrive with the backend.',
};

const NEUTRAL_PREVIEW_IMAGE = {
  imageUrl:
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=60',
  imageAlt: 'Traveler planning a mock getaway',
};

/** Destination-aware mock preview images for Loading (centralized, no per-page hardcoding). */
export function loadingPreviewImages(destination?: string): Array<{ imageUrl: string; imageAlt: string }> {
  if (!destination) return [NEUTRAL_PREVIEW_IMAGE, NEUTRAL_PREVIEW_IMAGE];
  const match = curatedDestinations.find((d) =>
    d.name.toLowerCase().includes(destination.toLowerCase()),
  );
  if (!match) return [NEUTRAL_PREVIEW_IMAGE, NEUTRAL_PREVIEW_IMAGE];
  return [
    { imageUrl: match.imageUrl, imageAlt: match.imageAlt },
    NEUTRAL_PREVIEW_IMAGE,
  ];
}
