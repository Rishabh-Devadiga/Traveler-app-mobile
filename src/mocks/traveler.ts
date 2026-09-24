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
import udaipurCityPalace from '../assets/udaipur-city-palace.jpg';
import agraImage from '../assets/destinations/agra.jpg';
import alibaugImage from '../assets/destinations/alibaug.jpg';
import amritsarImage from '../assets/destinations/amritsar.jpg';
import andamanImage from '../assets/destinations/andaman.jpg';
import auliImage from '../assets/destinations/auli.jpg';
import birBillingImage from '../assets/destinations/bir-billing.jpg';
import coorgImage from '../assets/destinations/coorg.jpg';
import darjeelingImage from '../assets/destinations/darjeeling.jpg';
import delhiImage from '../assets/destinations/delhi.jpg';
import dharamshalaImage from '../assets/destinations/dharamshala.jpg';
import gangtokImage from '../assets/destinations/gangtok.jpg';
import goaImage from '../assets/destinations/goa.jpg';
import gokarnaImage from '../assets/destinations/gokarna.jpg';
import hampiImage from '../assets/destinations/hampi.jpg';
import hyderabadImage from '../assets/destinations/hyderabad.jpg';
import indoreImage from '../assets/destinations/indore.jpg';
import jaipurImage from '../assets/destinations/jaipur.jpg';
import jaisalmerImage from '../assets/destinations/jaisalmer.jpg';
import jimCorbettImage from '../assets/destinations/jim-corbett.jpg';
import jodhpurImage from '../assets/destinations/jodhpur.jpg';
import kanhaImage from '../assets/destinations/kanha.jpg';
import kazirangaImage from '../assets/destinations/kaziranga.jpg';
import keralaImage from '../assets/destinations/kerala.jpg';
import khajurahoImage from '../assets/destinations/khajuraho.jpg';
import kochiImage from '../assets/destinations/kochi.jpg';
import kolkataImage from '../assets/destinations/kolkata.jpg';
import kovalamImage from '../assets/destinations/kovalam.jpg';
import lehLadakhImage from '../assets/destinations/leh-ladakh.jpg';
import lucknowImage from '../assets/destinations/lucknow.jpg';
import mahabalipuramImage from '../assets/destinations/mahabalipuram.jpg';
import manaliImage from '../assets/destinations/manali.jpg';
import meghalayaImage from '../assets/destinations/meghalaya.jpg';
import mumbaiImage from '../assets/destinations/mumbai.jpg';
import munnarImage from '../assets/destinations/munnar.jpg';
import mussoorieImage from '../assets/destinations/mussoorie.jpg';
import mysuruImage from '../assets/destinations/mysuru.jpg';
import nainitalImage from '../assets/destinations/nainital.jpg';
import nashikImage from '../assets/destinations/nashik.jpg';
import periyarImage from '../assets/destinations/periyar.jpg';
import pondicherryImage from '../assets/destinations/pondicherry.jpg';
import puriImage from '../assets/destinations/puri.jpg';
import ranthamboreImage from '../assets/destinations/ranthambore.jpg';
import rishikeshImage from '../assets/destinations/rishikesh.jpg';
import shimlaImage from '../assets/destinations/shimla.jpg';
import spitiImage from '../assets/destinations/spiti.jpg';
import sundarbansImage from '../assets/destinations/sundarbans.jpg';
import tarkarliImage from '../assets/destinations/tarkarli.jpg';
import varanasiImage from '../assets/destinations/varanasi.jpg';
import varkalaImage from '../assets/destinations/varkala.jpg';
import wayanadImage from '../assets/destinations/wayanad.jpg';

/**
 * Centralized Phase-1 mock data.
 * Curated destination photos are bundled locally in
 * `src/assets/destinations/` (one verified file per destination) so the
 * Home and Curated pages render offline after the production build.
 * `imageCredit` records each photo's source for attribution.
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
  appVersion: 'WanderAI v2.4',
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
  { id: 'nature', label: 'Nature', icon: 'park' },
  { id: 'adventure', label: 'Adventure', icon: 'hiking' },
  { id: 'wellness', label: 'Wellness', icon: 'spa' },
];

/**
 * Curated destination catalog (local sample data).
 *
 * Each entry carries explicit `categories` (Home filter ids) and
 * destination-level `subThemes`. Prices/durations are rough per-person trip
 * estimates in the app's existing display format — not live quotes.
 * New entries intentionally omit `reviewsLabel`: the card hides that line
 * rather than showing invented review counts. `isPopular` is an editorial
 * "most loved" selection, not a live platform metric.
 * Images are stable Unsplash URLs in the repo's existing format; every URL
 * is a single replaceable field and `SafeImage` renders a clean fallback if
 * one ever fails to load.
 */
export const curatedDestinations: Destination[] = [
  // ---- Existing entries (kept, enriched with explicit categories) ----
  {
    id: 'udaipur',
    name: 'Udaipur, Rajasthan',
    region: 'India · City of Lakes',
    pricePerPerson: '₹28K/person',
    idealDays: 'Ideal: 4 Days',
    rating: '4.9',
    reviewsLabel: '4.9 (1.2k WanderAI Reviews)',
    imageUrl: udaipurCityPalace,
    imageAlt: 'City Palace on Lake Pichola, Udaipur',
    tag: 'Top Pick',
    categories: ['heritage', 'popular'],
    subThemes: ['Forts & Palaces', 'Lake Views'],
    isPopular: true,
  },
  {
    id: 'goa',
    name: 'Goa Beaches',
    region: 'India · Beach & Sun',
    pricePerPerson: '₹22K/person',
    idealDays: 'Ideal: 3 Days',
    rating: '4.8',
    reviewsLabel: '4.8 (980 WanderAI Reviews)',
    imageUrl: goaImage,
    imageAlt: 'Baga Beach, Goa',
    imageCredit: 'Wikimedia Commons',
    categories: ['beach', 'foodie', 'adventure', 'popular'],
    subThemes: ['Relaxing Beaches', 'Coastal Cuisine'],
    isPopular: true,
  },
  {
    id: 'manali',
    name: 'Manali Valley',
    region: 'India · Mountain Escape',
    pricePerPerson: '₹25K/person',
    idealDays: 'Ideal: 5 Days',
    rating: '4.8',
    reviewsLabel: '4.8 (1.1k WanderAI Reviews)',
    imageUrl: manaliImage,
    imageAlt: 'Beas Valley near Manali',
    imageCredit: 'Wikimedia Commons',
    categories: ['mountain', 'adventure', 'popular'],
    subThemes: ['Valley Views', 'Adventure Travel'],
    isPopular: true,
  },
  {
    id: 'kerala',
    name: 'Kerala Backwaters',
    region: 'India · Slow Travel',
    pricePerPerson: '₹30K/person',
    idealDays: 'Ideal: 4 Days',
    rating: '4.9',
    reviewsLabel: '4.9 (860 WanderAI Reviews)',
    imageUrl: keralaImage,
    imageAlt: 'Houseboat on Alleppey backwaters, Kerala',
    imageCredit: 'Wikimedia Commons',
    categories: ['wellness', 'nature', 'popular'],
    subThemes: ['Slow Travel', 'Ayurveda'],
    isPopular: true,
  },
  // ---- Heritage & Culture ----
  {
    id: 'jaipur',
    name: 'Jaipur, Rajasthan',
    region: 'India · Pink City',
    pricePerPerson: '₹26K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: jaipurImage,
    imageAlt: 'Hawa Mahal east facade, Jaipur',
    imageCredit: 'Wikimedia Commons',
    tag: 'Top Pick',
    categories: ['heritage', 'foodie', 'popular'],
    subThemes: ['Forts & Palaces', 'Royal Rajasthan'],
    isPopular: true,
  },
  {
    id: 'jodhpur',
    name: 'Jodhpur, Rajasthan',
    region: 'India · Blue City',
    pricePerPerson: '₹24K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: jodhpurImage,
    imageAlt: 'Mehrangarh Fort above Jodhpur',
    imageCredit: 'Wikimedia Commons',
    categories: ['heritage'],
    subThemes: ['Forts & Palaces', 'Royal Rajasthan'],
  },
  {
    id: 'jaisalmer',
    name: 'Jaisalmer, Rajasthan',
    region: 'India · Thar Desert',
    pricePerPerson: '₹27K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: jaisalmerImage,
    imageAlt: 'Jaisalmer Fort illuminated at night',
    imageCredit: 'Wikimedia Commons',
    categories: ['heritage', 'adventure'],
    subThemes: ['Desert Culture', 'Forts & Palaces'],
  },
  {
    id: 'agra',
    name: 'Agra, Uttar Pradesh',
    region: 'India · City of the Taj',
    pricePerPerson: '₹22K/person',
    idealDays: 'Ideal: 2 Days',
    imageUrl: agraImage,
    imageAlt: 'Taj Mahal at sunrise, Agra',
    tag: 'UNESCO Heritage',
    categories: ['heritage', 'popular'],
    subThemes: ['UNESCO Heritage', 'Ancient Architecture'],
    isPopular: true,
  },
  {
    id: 'hampi',
    name: 'Hampi, Karnataka',
    region: 'India · Vijayanagara Ruins',
    pricePerPerson: '₹23K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: hampiImage,
    imageAlt: 'Virupaksha Temple on Hemakuta Hill, Hampi',
    imageCredit: 'Wikimedia Commons',
    tag: 'UNESCO Heritage',
    categories: ['heritage'],
    subThemes: ['UNESCO Heritage', 'Ancient Architecture'],
  },
  {
    id: 'khajuraho',
    name: 'Khajuraho, Madhya Pradesh',
    region: 'India · Temple Town',
    pricePerPerson: '₹24K/person',
    idealDays: 'Ideal: 2 Days',
    imageUrl: khajurahoImage,
    imageAlt: 'Lakshmana Temple, Khajuraho',
    imageCredit: 'Wikimedia Commons',
    tag: 'UNESCO Heritage',
    categories: ['heritage'],
    subThemes: ['UNESCO Heritage', 'Ancient Architecture'],
  },
  {
    id: 'mysuru',
    name: 'Mysuru, Karnataka',
    region: 'India · City of Palaces',
    pricePerPerson: '₹24K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: mysuruImage,
    imageAlt: 'Mysuru Palace in the morning',
    imageCredit: 'Wikimedia Commons',
    categories: ['heritage', 'foodie', 'popular'],
    subThemes: ['Royal Heritage', 'Palaces'],
    isPopular: true,
  },
  {
    id: 'mahabalipuram',
    name: 'Mahabalipuram, Tamil Nadu',
    region: 'India · Shore Temples',
    pricePerPerson: '₹23K/person',
    idealDays: 'Ideal: 2 Days',
    imageUrl: mahabalipuramImage,
    imageAlt: 'Shore Temple, Mahabalipuram',
    imageCredit: 'Wikimedia Commons',
    tag: 'UNESCO Heritage',
    categories: ['heritage'],
    subThemes: ['UNESCO Heritage', 'Ancient Architecture'],
  },
  {
    id: 'varanasi',
    name: 'Varanasi, Uttar Pradesh',
    region: 'India · Spiritual Capital',
    pricePerPerson: '₹22K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: varanasiImage,
    imageAlt: 'Evening Ganga aarti at Dashashwamedh Ghat, Varanasi',
    imageCredit: 'Wikimedia Commons',
    tag: 'Spiritual',
    categories: ['heritage', 'foodie', 'popular'],
    subThemes: ['Spiritual Heritage', 'Ancient City'],
    isPopular: true,
  },
  {
    id: 'amritsar',
    name: 'Amritsar, Punjab',
    region: 'India · Golden Temple City',
    pricePerPerson: '₹21K/person',
    idealDays: 'Ideal: 2 Days',
    imageUrl: amritsarImage,
    imageAlt: 'Golden Temple (Harmandir Sahib), Amritsar',
    imageCredit: 'Wikimedia Commons',
    categories: ['heritage', 'foodie', 'popular'],
    subThemes: ['Spiritual Heritage', 'Regional Cuisine'],
    isPopular: true,
  },
  // ---- Beach & Sun ----
  {
    id: 'gokarna',
    name: 'Gokarna, Karnataka',
    region: 'India · Laid-back Coast',
    pricePerPerson: '₹20K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: gokarnaImage,
    imageAlt: 'Om Beach, Gokarna',
    imageCredit: 'Wikimedia Commons',
    categories: ['beach'],
    subThemes: ['Relaxing Beaches', 'Sunset Spots'],
  },
  {
    id: 'varkala',
    name: 'Varkala, Kerala',
    region: 'India · Cliff Beaches',
    pricePerPerson: '₹24K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: varkalaImage,
    imageAlt: 'Varkala Cliff Beach, Kerala',
    imageCredit: 'Wikimedia Commons',
    categories: ['beach', 'wellness'],
    subThemes: ['Cliff Beaches', 'Yoga & Wellness'],
  },
  {
    id: 'kovalam',
    name: 'Kovalam, Kerala',
    region: 'India · Resort Coast',
    pricePerPerson: '₹26K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: kovalamImage,
    imageAlt: 'Lighthouse Beach, Kovalam',
    imageCredit: 'Wikimedia Commons',
    categories: ['beach', 'wellness'],
    subThemes: ['Family Beach Trips', 'Ayurveda'],
  },
  {
    id: 'alibaug',
    name: 'Alibaug, Maharashtra',
    region: 'India · Konkan Coast',
    pricePerPerson: '₹18K/person',
    idealDays: 'Ideal: 2 Days',
    imageUrl: alibaugImage,
    imageAlt: 'Kolaba Fort causeway, Alibaug',
    imageCredit: 'Wikimedia Commons',
    categories: ['beach'],
    subThemes: ['Coastal Escapes', 'Family Beach Trips'],
  },
  {
    id: 'tarkarli',
    name: 'Tarkarli, Maharashtra',
    region: 'India · Clear-water Coast',
    pricePerPerson: '₹22K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: tarkarliImage,
    imageAlt: 'Tarkarli Beach, Malvan',
    imageCredit: 'Wikimedia Commons',
    categories: ['beach', 'adventure'],
    subThemes: ['Water Activities', 'Coastal Escapes'],
  },
  {
    id: 'puri',
    name: 'Puri, Odisha',
    region: 'India · Temple Coast',
    pricePerPerson: '₹19K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: puriImage,
    imageAlt: 'Evening at Puri beach, Odisha',
    imageCredit: 'Wikimedia Commons',
    categories: ['beach', 'heritage'],
    subThemes: ['Temple Town', 'Relaxing Beaches'],
  },
  {
    id: 'andaman',
    name: 'Andaman Islands',
    region: 'India · Island Getaway',
    pricePerPerson: '₹35K/person',
    idealDays: 'Ideal: 5 Days',
    imageUrl: andamanImage,
    imageAlt: 'Radhanagar Beach, Havelock Island, Andamans',
    imageCredit: 'Wikimedia Commons',
    tag: 'Island Getaway',
    categories: ['beach', 'adventure', 'popular'],
    subThemes: ['Island Getaways', 'Water Activities'],
    isPopular: true,
  },
  // ---- Mountain Escape ----
  {
    id: 'shimla',
    name: 'Shimla, Himachal Pradesh',
    region: 'India · Queen of Hills',
    pricePerPerson: '₹23K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: shimlaImage,
    imageAlt: 'Shimla town across the hills',
    imageCredit: 'Wikimedia Commons',
    categories: ['mountain', 'popular'],
    subThemes: ['Hill Stations', 'Valley Views'],
    isPopular: true,
  },
  {
    id: 'dharamshala',
    name: 'Dharamshala, Himachal Pradesh',
    region: 'India · Little Lhasa',
    pricePerPerson: '₹22K/person',
    idealDays: 'Ideal: 4 Days',
    imageUrl: dharamshalaImage,
    imageAlt: 'Dhauladhar view from Triund, McLeod Ganj, Dharamshala',
    imageCredit: 'Wikimedia Commons',
    categories: ['mountain', 'wellness'],
    subThemes: ['Peaceful Getaways', 'Himalayan Escapes'],
  },
  {
    id: 'mussoorie',
    name: 'Mussoorie, Uttarakhand',
    region: 'India · Queen of Garhwal',
    pricePerPerson: '₹21K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: mussoorieImage,
    imageAlt: 'Kempty Falls, Mussoorie',
    imageCredit: 'Wikimedia Commons',
    categories: ['mountain'],
    subThemes: ['Hill Stations', 'Valley Views'],
  },
  {
    id: 'nainital',
    name: 'Nainital, Uttarakhand',
    region: 'India · Lake District',
    pricePerPerson: '₹20K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: nainitalImage,
    imageAlt: 'Boating on Naini Lake, Nainital',
    imageCredit: 'Wikimedia Commons',
    categories: ['mountain'],
    subThemes: ['Lake Town', 'Hill Stations'],
  },
  {
    id: 'rishikesh',
    name: 'Rishikesh, Uttarakhand',
    region: 'India · Yoga Capital',
    pricePerPerson: '₹18K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: rishikeshImage,
    imageAlt: 'Rafting on the Ganga near Ram Jhula, Rishikesh',
    imageCredit: 'Wikimedia Commons',
    categories: ['mountain', 'adventure', 'wellness'],
    subThemes: ['Yoga & Wellness', 'Rafting'],
  },
  {
    id: 'auli',
    name: 'Auli, Uttarakhand',
    region: 'India · Ski Slopes',
    pricePerPerson: '₹26K/person',
    idealDays: 'Ideal: 4 Days',
    imageUrl: auliImage,
    imageAlt: 'Nanda Devi view from Auli',
    imageCredit: 'Wikimedia Commons',
    categories: ['mountain', 'adventure'],
    subThemes: ['Himalayan Escapes', 'Snow Views'],
  },
  {
    id: 'darjeeling',
    name: 'Darjeeling, West Bengal',
    region: 'India · Tea Gardens',
    pricePerPerson: '₹24K/person',
    idealDays: 'Ideal: 4 Days',
    imageUrl: darjeelingImage,
    imageAlt: 'Darjeeling town on the hillside',
    imageCredit: 'Wikimedia Commons',
    categories: ['mountain', 'popular'],
    subThemes: ['Tea Gardens', 'Himalayan Escapes'],
    isPopular: true,
  },
  {
    id: 'gangtok',
    name: 'Gangtok, Sikkim',
    region: 'India · Himalayan Capital',
    pricePerPerson: '₹25K/person',
    idealDays: 'Ideal: 4 Days',
    imageUrl: gangtokImage,
    imageAlt: 'Gangtok city viewed from the ropeway, Sikkim',
    imageCredit: 'Wikimedia Commons',
    categories: ['mountain'],
    subThemes: ['Himalayan Escapes', 'Valley Views'],
  },
  {
    id: 'munnar',
    name: 'Munnar, Kerala',
    region: 'India · Tea Country',
    pricePerPerson: '₹24K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: munnarImage,
    imageAlt: 'Tea gardens, Munnar',
    imageCredit: 'Wikimedia Commons',
    categories: ['mountain', 'wellness', 'popular'],
    subThemes: ['Tea Gardens', 'Nature Relaxation'],
    isPopular: true,
  },
  {
    id: 'coorg',
    name: 'Coorg, Karnataka',
    region: 'India · Scotland of India',
    pricePerPerson: '₹22K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: coorgImage,
    imageAlt: 'Abbey Falls, Coorg',
    imageCredit: 'Wikimedia Commons',
    categories: ['mountain', 'wellness', 'nature'],
    subThemes: ['Coffee Estates', 'Nature Relaxation'],
  },
  // ---- Foodie & Culinary ----
  {
    id: 'lucknow',
    name: 'Lucknow, Uttar Pradesh',
    region: 'India · City of Nawabs',
    pricePerPerson: '₹20K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: lucknowImage,
    imageAlt: 'Historic Residency complex, Lucknow',
    imageCredit: 'Wikimedia Commons',
    categories: ['foodie'],
    subThemes: ['Royal Cuisine', 'Street Food'],
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad, Telangana',
    region: 'India · Biryani Capital',
    pricePerPerson: '₹22K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: hyderabadImage,
    imageAlt: 'Charminar illuminated in the evening, Hyderabad',
    imageCredit: 'Wikimedia Commons',
    categories: ['foodie', 'popular'],
    subThemes: ['Regional Cuisine', 'Street Food'],
    isPopular: true,
  },
  {
    id: 'indore',
    name: 'Indore, Madhya Pradesh',
    region: 'India · Street Food Hub',
    pricePerPerson: '₹17K/person',
    idealDays: 'Ideal: 2 Days',
    imageUrl: indoreImage,
    imageAlt: 'Rajwada Palace, Indore',
    imageCredit: 'Wikimedia Commons',
    tag: 'Street Food',
    categories: ['foodie'],
    subThemes: ['Street Food', 'Food Markets'],
  },
  {
    id: 'delhi',
    name: 'Delhi',
    region: 'India · Capital Flavours',
    pricePerPerson: '₹23K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: delhiImage,
    imageAlt: 'India Gate, Delhi',
    categories: ['foodie', 'heritage', 'popular'],
    subThemes: ['Street Food', 'Historical Cities'],
    isPopular: true,
  },
  {
    id: 'kolkata',
    name: 'Kolkata, West Bengal',
    region: 'India · City of Joy',
    pricePerPerson: '₹20K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: kolkataImage,
    imageAlt: 'Victoria Memorial, Kolkata',
    imageCredit: 'Wikimedia Commons',
    categories: ['foodie'],
    subThemes: ['Street Food', 'Regional Cuisine'],
  },
  {
    id: 'mumbai',
    name: 'Mumbai, Maharashtra',
    region: 'India · Maximum City',
    pricePerPerson: '₹25K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: mumbaiImage,
    imageAlt: 'Gateway of India, Mumbai',
    imageCredit: 'Wikimedia Commons',
    categories: ['foodie', 'popular'],
    subThemes: ['Street Food', 'Coastal Cuisine'],
    isPopular: true,
  },
  {
    id: 'kochi',
    name: 'Kochi, Kerala',
    region: 'India · Spice Coast',
    pricePerPerson: '₹23K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: kochiImage,
    imageAlt: 'Chinese fishing nets, Fort Kochi',
    imageCredit: 'Wikimedia Commons',
    categories: ['foodie'],
    subThemes: ['Coastal Cuisine', 'Food Markets'],
  },
  // ---- Nature & Wildlife ----
  {
    id: 'kaziranga',
    name: 'Kaziranga, Assam',
    region: 'India · Rhino Country',
    pricePerPerson: '₹28K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: kazirangaImage,
    imageAlt: 'One-horned rhinoceros in Kaziranga National Park',
    imageCredit: 'Wikimedia Commons',
    tag: 'Wildlife',
    categories: ['nature'],
    subThemes: ['Wildlife', 'National Parks'],
  },
  {
    id: 'jim-corbett',
    name: 'Jim Corbett, Uttarakhand',
    region: 'India · Tiger Reserve',
    pricePerPerson: '₹24K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: jimCorbettImage,
    imageAlt: 'Jungle safari in Jhirna Zone, Jim Corbett',
    imageCredit: 'Wikimedia Commons',
    tag: 'Wildlife',
    categories: ['nature', 'popular'],
    subThemes: ['Wildlife', 'National Parks'],
    isPopular: true,
  },
  {
    id: 'ranthambore',
    name: 'Ranthambore, Rajasthan',
    region: 'India · Fort & Forest',
    pricePerPerson: '₹26K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: ranthamboreImage,
    imageAlt: 'View of the park from Ranthambore Fort',
    imageCredit: 'Wikimedia Commons',
    tag: 'Wildlife',
    categories: ['nature', 'heritage'],
    subThemes: ['Wildlife', 'Forts & Palaces'],
  },
  {
    id: 'periyar',
    name: 'Periyar, Kerala',
    region: 'India · Spice Forest',
    pricePerPerson: '₹23K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: periyarImage,
    imageAlt: 'Periyar Lake, Thekkady',
    imageCredit: 'Wikimedia Commons',
    categories: ['nature'],
    subThemes: ['Wildlife', 'Forest Retreats'],
  },
  {
    id: 'kanha',
    name: 'Kanha, Madhya Pradesh',
    region: 'India · Jungle Book Forest',
    pricePerPerson: '₹25K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: kanhaImage,
    imageAlt: 'Bengal tiger in Kanha National Park',
    imageCredit: 'Wikimedia Commons',
    categories: ['nature'],
    subThemes: ['Wildlife', 'National Parks'],
  },
  {
    id: 'wayanad',
    name: 'Wayanad, Kerala',
    region: 'India · Green Hills',
    pricePerPerson: '₹22K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: wayanadImage,
    imageAlt: 'Chembra Peak grasslands, Wayanad',
    imageCredit: 'Wikimedia Commons',
    categories: ['nature', 'adventure'],
    subThemes: ['Forest Retreats', 'Trekking Areas'],
  },
  {
    id: 'sundarbans',
    name: 'Sundarbans, West Bengal',
    region: 'India · Mangrove Delta',
    pricePerPerson: '₹24K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: sundarbansImage,
    imageAlt: 'Spotted deer in Sundarbans National Park',
    imageCredit: 'Wikimedia Commons',
    categories: ['nature'],
    subThemes: ['Biodiversity', 'Eco-Tourism'],
  },
  // ---- Adventure & Activities ----
  {
    id: 'bir-billing',
    name: 'Bir Billing, Himachal Pradesh',
    region: 'India · Paragliding Capital',
    pricePerPerson: '₹21K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: birBillingImage,
    imageAlt: 'Paragliding over Bir Billing',
    imageCredit: 'Wikimedia Commons',
    tag: 'Paragliding',
    categories: ['adventure', 'mountain'],
    subThemes: ['Paragliding', 'Valley Views'],
  },
  {
    id: 'leh-ladakh',
    name: 'Leh-Ladakh',
    region: 'India · High Himalaya',
    pricePerPerson: '₹32K/person',
    idealDays: 'Ideal: 6 Days',
    imageUrl: lehLadakhImage,
    imageAlt: 'Leh Palace, Ladakh',
    imageCredit: 'Wikimedia Commons',
    tag: 'Road Trips',
    categories: ['adventure', 'mountain', 'popular'],
    subThemes: ['High-Altitude Desert', 'Road Trips'],
    isPopular: true,
  },
  {
    id: 'spiti',
    name: 'Spiti Valley, Himachal Pradesh',
    region: 'India · Cold Desert',
    pricePerPerson: '₹28K/person',
    idealDays: 'Ideal: 6 Days',
    imageUrl: spitiImage,
    imageAlt: 'Key Monastery, Spiti Valley',
    imageCredit: 'Wikimedia Commons',
    categories: ['adventure', 'mountain'],
    subThemes: ['Road Trips', 'High-Altitude Desert'],
  },
  {
    id: 'meghalaya',
    name: 'Meghalaya',
    region: 'India · Abode of Clouds',
    pricePerPerson: '₹26K/person',
    idealDays: 'Ideal: 5 Days',
    imageUrl: meghalayaImage,
    imageAlt: 'Nohkalikai Falls, Cherrapunji, Meghalaya',
    imageCredit: 'Wikimedia Commons',
    tag: 'Waterfalls',
    categories: ['adventure', 'nature'],
    subThemes: ['Waterfalls', 'Eco-Tourism'],
  },
  // ---- Wellness & Peaceful Escapes ----
  {
    id: 'pondicherry',
    name: 'Pondicherry',
    region: 'India · French Quarter Coast',
    pricePerPerson: '₹22K/person',
    idealDays: 'Ideal: 3 Days',
    imageUrl: pondicherryImage,
    imageAlt: 'Rock Beach promenade, Pondicherry',
    imageCredit: 'Wikimedia Commons',
    categories: ['wellness', 'beach', 'heritage'],
    subThemes: ['Yoga & Wellness', 'French Quarter'],
  },
  {
    id: 'nashik',
    name: 'Nashik, Maharashtra',
    region: 'India · Vineyard Country',
    pricePerPerson: '₹20K/person',
    idealDays: 'Ideal: 2 Days',
    imageUrl: nashikImage,
    imageAlt: 'Sula Vineyards, Nashik',
    imageCredit: 'Wikimedia Commons',
    categories: ['wellness', 'foodie'],
    subThemes: ['Vineyards', 'Quiet Retreats'],
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
    imageUrl: nainitalImage,
    imageAlt: 'Boats on Naini Lake, Nainital',
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
  listeningLabel: 'WanderAI Listening',
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
    title: 'About WanderAI',
    subtitle: 'WanderAI v2.4 (Build 204)',
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
  badge: 'WanderAI V2.4',
  eyebrow: 'MEET YOUR AI COMPANION',
  titlePrefix: 'WELCOME TO',
  titleBrand: 'WanderAI',
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
  { label: 'Jodhpur', pattern: /\bjodhpur\b/i },
  { label: 'Khajuraho', pattern: /\bkhajuraho\b/i },
  { label: 'Mahabalipuram', pattern: /\bmahabalipuram\b|\bmamallapuram\b/i },
  { label: 'Amritsar', pattern: /\bamritsar\b/i },
  { label: 'Lucknow', pattern: /\blacknow\b|\bawadh\b/i },
  { label: 'Hyderabad', pattern: /\bhyderabad\b/i },
  { label: 'Indore', pattern: /\bindore\b/i },
  { label: 'Kolkata', pattern: /\bkolkata\b|\bcalcutta\b/i },
  { label: 'Nashik', pattern: /\bnashik\b/i },
  { label: 'Gokarna', pattern: /\bgokarna\b/i },
  { label: 'Varkala', pattern: /\bvarkala\b/i },
  { label: 'Alibaug', pattern: /\balibaug\b/i },
  { label: 'Tarkarli', pattern: /\btarkarli\b/i },
  { label: 'Puri', pattern: /\bpuri\b/i },
  { label: 'Dharamshala', pattern: /\bdharamshala\b|\bdharamsala\b|\bmcleodganj\b/i },
  { label: 'Auli', pattern: /\bauli\b/i },
  { label: 'Gangtok', pattern: /\bgangtok\b|\bsikkim\b/i },
  { label: 'Nainital', pattern: /\bnainital\b/i },
  { label: 'Mussoorie', pattern: /\bmussoorie\b/i },
  { label: 'Spiti Valley', pattern: /\bspiti\b/i },
  { label: 'Bir Billing', pattern: /\bbir\b|\bbilling\b/i },
  { label: 'Meghalaya', pattern: /\bmeghalaya\b|\bshillong\b|\bcherrapunji\b/i },
  { label: 'Kaziranga', pattern: /\bkaziranga\b/i },
  { label: 'Jim Corbett', pattern: /\bcorbett\b|\bjim corbett\b/i },
  { label: 'Ranthambore', pattern: /\branthambore\b/i },
  { label: 'Kanha', pattern: /\bkanha\b/i },
  { label: 'Wayanad', pattern: /\bwayanad\b/i },
  { label: 'Sundarbans', pattern: /\bsundarban/i },
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
