import flightImage from '../assets/transport/indigo-plane.jpg';
import busImage from '../assets/transport/volvo-bus.jpg';
import cabImage from '../assets/transport/cab.jpg';
import trainImage from '../assets/transport/mail-express.jpg';

/**
 * Fixed local artwork for transport cards — selected by transport mode so
 * every card (including ones generated dynamically from itinerary data)
 * consistently gets its corresponding image. No remote URLs: Vite bundles
 * these imports into both dev and production builds.
 *
 * Mode strings seen across the app/API: 'flight', 'train', 'rail'/'mail',
 * 'volvo_bus', 'private_cab', 'self_drive'. Anything unrecognized (e.g.
 * self-drive or unknown road options) falls back to the generic road image.
 */
export function transportImageFor(mode?: string | null): string {
  const normalized = (mode ?? '').trim().toLowerCase();
  if (normalized.includes('flight') || normalized.includes('plane') || normalized.includes('air')) {
    return flightImage;
  }
  if (normalized.includes('train') || normalized.includes('rail') || normalized.includes('mail')) {
    return trainImage;
  }
  if (normalized.includes('bus') || normalized.includes('volvo')) {
    return busImage;
  }
  if (normalized.includes('cab') || normalized.includes('taxi')) {
    return cabImage;
  }
  return cabImage;
}
