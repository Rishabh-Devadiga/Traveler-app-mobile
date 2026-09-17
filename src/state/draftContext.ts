import { createContext } from 'react';
import type { TripDraftContextValue } from './useTripDraft';

export const TripDraftContext = createContext<TripDraftContextValue | null>(null);
