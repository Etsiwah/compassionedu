/**
 * Client-side validation utilities.
 * Mirror the server-side constraints so users get instant feedback.
 */

/** Accepted MIME types for profile photos */
export const PROFILE_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Accepted MIME types for CV uploads */
export const CV_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Max file sizes in bytes */
export const MAX_PROFILE_PHOTO_SIZE = 10 * 1024 * 1024;  // 10 MB
export const MAX_CV_SIZE            = 50 * 1024 * 1024;  // 50 MB
export const MAX_MEDIA_SIZE         = 50 * 1024 * 1024;  // 50 MB

/**
 * Validate a profile photo file.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateProfilePhoto(file) {
  if (!PROFILE_PHOTO_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Profile photo must be JPEG, PNG, or WEBP.' };
  }
  if (file.size > MAX_PROFILE_PHOTO_SIZE) {
    return { valid: false, error: 'Profile photo must not exceed 10 MB.' };
  }
  return { valid: true };
}

/**
 * Validate a CV file.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCV(file) {
  if (!CV_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'CV must be a PDF or DOCX file.' };
  }
  if (file.size > MAX_CV_SIZE) {
    return { valid: false, error: 'CV must not exceed 50 MB.' };
  }
  return { valid: true };
}

/**
 * Validate a portfolio media file.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePortfolioMedia(file) {
  if (file.size > MAX_MEDIA_SIZE) {
    return { valid: false, error: 'Portfolio media must not exceed 50 MB.' };
  }
  return { valid: true };
}

/**
 * Validate an email address format.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate that marks are within the 0–100 range.
 * @param {number} marks
 * @returns {boolean}
 */
export function isValidMarks(marks) {
  return typeof marks === 'number' && marks >= 0 && marks <= 100;
}
