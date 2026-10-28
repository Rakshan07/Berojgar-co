export const passwordGuide = 'Use at least 8 characters, including an uppercase letter, a lowercase letter, a number, and a special character.';
export function validNewPassword(value) {
  return value.length >= 8 && value.length <= 128 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9\s]/.test(value);
}
