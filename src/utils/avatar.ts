/**
 * Client-side avatar processing for the TourFlow Profile page.
 *
 * There is no image-upload endpoint in the existing backend (the TourFlow API
 * exposed to this frontend only serves trip endpoints — see `src/api/trips.ts`),
 * so the smallest storage mechanism consistent with this frontend-only app is a
 * downscaled data-URL persisted in localStorage by `src/api/profile.ts`.
 * Downscaling keeps the stored value small enough to survive refresh reliably.
 */

export const AVATAR_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp';
export const AVATAR_MAX_INPUT_BYTES = 5 * 1024 * 1024; // 5 MB selected file
export const AVATAR_MAX_DIMENSION_PX = 512; // stored image is downscaled to fit

export class AvatarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AvatarError';
  }
}

/** Validate the selected file's type and size before any decoding work. */
export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_ACCEPT.includes(file.type as (typeof AVATAR_ACCEPT)[number])) {
    return 'Unsupported image type. Please choose a JPG, PNG or WebP image.';
  }
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    return 'Image is too large. Please choose an image under 5 MB.';
  }
  return null;
}

/** Decode a File to an HTMLImageElement via an object URL (transient — never persisted). */
function decodeFile(file: File): Promise<{ img: HTMLImageElement; objectUrl: string }> {
  const objectUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, objectUrl });
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new AvatarError('Could not read that image. Please try a different file.'));
    };
    img.src = objectUrl;
  });
}

/**
 * Downscale the image to fit within AVATAR_MAX_DIMENSION_PX and return a
 * persistent `data:` URL (JPEG for photos, PNG when transparency exists).
 * The transient object URL used for decoding is always revoked.
 */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const validationError = validateAvatarFile(file);
  if (validationError) throw new AvatarError(validationError);

  const { img, objectUrl } = await decodeFile(file);
  try {
    const scale = Math.min(1, AVATAR_MAX_DIMENSION_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new AvatarError('Could not process that image on this device.');
    ctx.drawImage(img, 0, 0, width, height);
    // PNG/WebP uploads keep PNG output (preserves transparency); JPEG stays JPEG.
    const outputType = file.type === 'image/png' || file.type === 'image/webp' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(outputType, 0.85);
    if (!dataUrl.startsWith('data:image/')) throw new AvatarError('Could not process that image.');
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
