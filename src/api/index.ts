export { apiClient, isApiConfigured, ApiError } from './client';
export {
  createTrip,
  getTrip,
  updateTripDates,
  changeAccommodation,
  changeDayAccommodation,
  swapActivity,
  addActivity,
  deleteActivity,
  editActivity,
  toggleActivity,
  confirmTrip,
  optimizeTrip,
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
export type { SwapActivityInput, AddActivityInput, EditActivityInput } from './trips';
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
