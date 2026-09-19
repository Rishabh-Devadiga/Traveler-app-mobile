/**
 * Field validation for the TourFlow Profile page.
 * Pure functions — no UI, no storage — so they are unit-testable in isolation.
 */

export function validateName(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Please enter your name.';
  if (value.length > 80) return 'Name must be 80 characters or fewer.';
  return null;
}

export function validatePhone(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Please enter your phone number.';
  if (value.length > 32) return 'Phone number is too long.';
  // Allow +, digits, spaces, dashes, dots, parentheses — but require 7–15 digits.
  if (!/^[+()\-.\s\d]+$/.test(value)) return 'Phone number contains invalid characters.';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return 'Enter a valid phone number (7–15 digits).';
  }
  return null;
}

export function validateEmail(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Please enter your email address.';
  if (value.length > 254) return 'Email address is too long.';
  // Practical RFC-5322 subset — rejects missing @, missing domain, spaces.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return 'Enter a valid email address (e.g. name@example.com).';
  }
  return null;
}
