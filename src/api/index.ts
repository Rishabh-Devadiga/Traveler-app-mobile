export { apiClient, isApiConfigured, ApiError } from './client';
export {
  createTrip,
  getTrip,
  tripDraftToCreateRequest,
  apiItineraryToDays,
  toStayOption,
  asApiTrip,
} from './trips';
export type {
  TripCreateRequest,
  ApiItineraryItem,
  ApiStayOption,
  ApiTripWithItinerary,
  ItinerarySource,
  ResolvedItinerary,
} from './trips';
export { getPossibleOptions } from './options';
export {
  PROFILE_STORAGE_KEY,
  loadProfile,
  saveProfilePatch,
  removeStoredAvatar,
  ProfileError,
} from './profile';
export type { UserProfile, ProfilePatch, ProfileSettings, NotificationSettings } from './profile';
