// Shared between both registration pages and both profile editors, so it lives
// here rather than as a module-level const in each page. The backend enforces
// the same shape in App\Support\Phone; this is the same rule expressed for
// immediate feedback, not a substitute for it.

export const COUNTRY_NAME = 'Nigeria'

export const DIAL_CODE = '+234'

export const PHONE_PLACEHOLDER = '0801 234 5678'

/**
 * The 36 states plus the Federal Capital Territory. Mirrors
 * backend/config/regions.php, which is the copy the server validates against.
 */
export const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'Federal Capital Territory',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
]

/**
 * True when the value is not obviously empty.
 */
export function hasValue(value) {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * The 10-digit national number behind any accepted spelling, or null.
 *
 * Same rules as the server: 00234 / 234 / 0 are each peeled off and the
 * remainder must be a 10-digit national mobile starting 7, 8 or 9. Requiring
 * that leading digit is what rejects a landline like 0123 456 789, which has
 * the right digit count and would slip through a length check.
 */
export function nationalPhoneDigits(value) {
  if (!hasValue(value)) return null

  const digits = value.replace(/\D/g, '')
  if (digits === '' || digits.length > 15) return null

  const mobile = /^(?:7|8|9)\d{9}$/

  for (const prefix of ['00234', '234', '0']) {
    if (!digits.startsWith(prefix)) continue
    const candidate = digits.slice(prefix.length)
    return mobile.test(candidate) ? candidate : null
  }

  return mobile.test(digits) ? digits : null
}

/**
 * The field-level message for a phone input, or null when it is acceptable.
 * Required and format are reported separately so the user is told which one
 * they got wrong.
 */
export function phoneError(value, { required = true } = {}) {
  if (!hasValue(value)) {
    return required ? 'Please enter your phone number.' : null
  }

  return nationalPhoneDigits(value)
    ? null
    : 'Enter a valid Nigerian phone number, for example 0801 234 5678.'
}

/**
 * Grouped for readability, matching what the server stores and displays.
 */
export function formatPhone(value) {
  const national = nationalPhoneDigits(value)
  if (!national) return hasValue(value) ? value : ''

  return `${DIAL_CODE} ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`
}