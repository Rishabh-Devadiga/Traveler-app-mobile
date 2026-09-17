export interface TravelerUser {
  name: string;
  firstName: string;
  tier: string;
  activeTripLabel: string;
  phone: string;
  email: string;
  avatarUrl: string;
  preferences: string;
  language: string;
  currency: string;
  appVersion: string;
  build: string;
}

export interface Destination {
  id: string;
  name: string;
  region: string;
  pricePerPerson: string;
  idealDays: string;
  rating: string;
  reviewsLabel: string;
  imageUrl: string;
  imageAlt: string;
  tag?: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
}

export interface InspirationTrip {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
}

export interface ChecklistItem {
  id: string;
  icon: string;
  label: string;
  value: string;
  hint?: string;
}

export interface BudgetSummary {
  total: string;
  perPerson: string;
  tier: string;
  interests: string;
}

export interface LoadingStep {
  id: string;
  label: string;
  detail?: string;
  status: 'done' | 'active' | 'pending';
}

export interface ItineraryStop {
  id: string;
  time: string;
  title: string;
  description: string;
  costLabel?: string;
  tags: string[];
  imageUrl?: string;
  imageAlt?: string;
  featured?: boolean;
  badge?: string;
}

export interface ItineraryDay {
  id: string;
  day: number;
  title: string;
  stopsCount: number;
  stops: ItineraryStop[];
}

export interface ItineraryMetric {
  id: string;
  value: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

export interface RestaurantPick {
  id: string;
  name: string;
  area: string;
  priceForTwo: string;
  rating: string;
  reviews: string;
  matchLabel: string;
  imageUrl: string;
  imageAlt: string;
}

export interface TripPlanItem {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  done?: boolean;
  current?: boolean;
}

export interface BookingItem {
  id: string;
  label: string;
  detail: string;
  status: string;
}

export interface ProfileInfoRow {
  id: string;
  label: string;
  value: string;
  verified?: boolean;
}

export interface ProfileMenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

export interface OnboardingSlide {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
}
