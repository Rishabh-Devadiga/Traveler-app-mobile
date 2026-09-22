export { apiClient, isApiConfigured, getApiBaseUrl, apiErrorMessage, ApiError } from './client';
export {
  createTrip,
  getTrip,
  listTravelerTrips,
  saveTravelerTrip,
  getTravelerTrip,
  fetchPersistedTrip,
  travelerTripName,
  seedDraftFromTrip,
  updateTripDates,
  updateTripPace,
  matchTripPace,
  TRIP_PACES,
  changeAccommodation,
  changeDayAccommodation,
  swapActivity,
  addActivity,
  deleteActivity,
  editActivity,
  toggleActivity,
  confirmTrip,
  optimizeTrip,
  getTripMap,
  normalizeTripMap,
  fallbackMapFromDays,
  isCountableStop,
  countStops,
  readActiveTripId,
  writeActiveTripId,
  clearActiveTripId,
  isTripMarkedConfirmed,
  markTripConfirmed,
  unmarkTripConfirmed,
  isTripConfirmedStatus,
  applyServerTrip,
  tripDraftToCreateRequest,
  apiItineraryToDays,
  toStayOption,
  asApiTrip,
} from './trips';
export type { SwapActivityInput, AddActivityInput, EditActivityInput, TravelerTripSummary, ApiMapStop, ApiTripMap, TripMapPin, NormalizedTripMap, TripPaceId } from './trips';
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
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from './notifications';
export type { TravelerNotification } from './notifications';
export { extractPreferences } from './ai';
export {
  TRAVELER_TOKEN_KEY,
  getTravelerToken,
  hasTravelerToken,
  setTravelerToken,
  clearTravelerToken,
  travelerLogin,
  travelerSignup,
  travelerLogout,
  getTravelerMe,
  restoreTravelerSession,
  isUnauthorized,
} from './auth';
export type { TravelerUser as TravelerAuthUser } from './auth';
export {
  getTravelerProfile,
  patchTravelerProfile,
  profileInitial,
  safeText,
  dietaryDisplay,
  avatarUrlFor,
  bumpAvatarVersion,
  logAvatarEndpoints,
  uploadTravelerAvatar,
  deleteTravelerAvatar,
} from './traveler';
export type { TravelerProfile, TravelerProfilePatch } from './traveler';
export { getGuideGreeting, getGuideHistory, postGuideChat } from './guide';
export type {
  GuideGreeting,
  GuideHistory,
  GuideHistoryMessage,
  GuideMessageRole,
  GuideAction,
  GuideTripCard,
  GuideChatRequest,
  GuideChatResponse,
} from './guide';
export {
  PROFILE_STORAGE_KEY,
  loadProfile,
  saveProfilePatch,
  removeStoredAvatar,
  ProfileError,
} from './profile';
export type { UserProfile, ProfilePatch, ProfileSettings, NotificationSettings } from './profile';
