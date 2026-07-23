export const LIMITS = {
  age: { min: 13, max: 90 },
  height: { min: 100, max: 230 },
  weight: { min: 30, max: 250 },
  bodyCm: { min: 20, max: 250 },
  waterCups: { min: 1, max: 20 },
  calories: { min: 0, max: 5000 },
  dailyCalories: { min: 1200, max: 5000 },
  macroGrams: { min: 0, max: 500 },
  proteinGoal: { min: 20, max: 350 },
  workoutsPerWeek: { min: 1, max: 7 },
  exerciseKg: { min: 0, max: 500 },
  shortText: { min: 2, max: 50 },
}

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return NaN
  const normalized = String(value).replace(',', '.').trim()
  if (!normalized) return NaN
  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}

export function isInRange(value, min, max) {
  const n = toNumber(value)
  return Number.isFinite(n) && n >= min && n <= max
}

export function clampNumber(value, min, max, fallback = min) {
  const n = toNumber(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function rangeError(label, value, min, max, unit = '', isEn = false) {
  const n = toNumber(value)
  if (!Number.isFinite(n)) {
    return isEn
      ? `${label} must be a valid number.`
      : `${label} мора да биде валиден број.`
  }
  if (n < min || n > max) {
    const suffix = unit ? ` ${unit}` : ''
    return isEn
      ? `${label} must be between ${min} and ${max}${suffix}.`
      : `${label} мора да биде од ${min} до ${max}${suffix}.`
  }
  return ''
}

export function optionalRangeError(label, value, min, max, unit = '', isEn = false) {
  if (value === null || value === undefined || String(value).trim() === '') return ''
  return rangeError(label, value, min, max, unit, isEn)
}

export function cleanText(value, maxLength = 120) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

export function hasRealText(value, minLength = 1) {
  return cleanText(value).length >= minLength
}

export function isValidEmail(value) {
  const email = cleanText(value, 254).toLowerCase()
  if (!email || email.length < 6 || email.length > 254) return false
  if (/\s/.test(email)) return false
  // Requires a real domain with a dot and a 2+ character TLD. Blocks examples like a@a.
  return /^[^@\s]{1,64}@(?:[a-z0-9-]+\.)+[a-z]{2,24}$/i.test(email)
}

export function emailError(value, isEn = false) {
  return isValidEmail(value)
    ? ''
    : isEn
      ? 'Enter a valid email address, for example name@example.com.'
      : 'Внеси валиден email, пример name@example.com.'
}

export function validateNamePart(label, value, isEn = false) {
  const cleaned = cleanText(value, LIMITS.shortText.max)
  if (!cleaned) return isEn ? `${label} is required.` : `${label} е задолжително.`
  if (cleaned.length < LIMITS.shortText.min) return isEn ? `${label} must have at least 2 characters.` : `${label} мора да има најмалку 2 карактери.`
  if (cleaned.length > LIMITS.shortText.max) return isEn ? `${label} can have up to 50 characters.` : `${label} може да има максимум 50 карактери.`
  // Allow Macedonian/Latin letters, spaces, hyphen and apostrophe. Reject numbers/symbol-only input.
  if (!/^[\p{L}][\p{L}\s'-]*$/u.test(cleaned)) return isEn ? `${label} can contain letters only.` : `${label} може да содржи само букви.`
  return ''
}

export function validateFullName(value, isEn = false) {
  const cleaned = cleanText(value, 110)
  if (!cleaned) return isEn ? 'Enter your first and last name.' : 'Внеси име и презиме.'
  const parts = cleaned.split(' ').filter(Boolean)
  if (parts.length < 2) return isEn ? 'Enter both first and last name.' : 'Внеси и име и презиме.'
  const firstError = validateNamePart(isEn ? 'First name' : 'Име', parts[0], isEn)
  if (firstError) return firstError
  const lastError = validateNamePart(isEn ? 'Last name' : 'Презиме', parts.slice(1).join(' '), isEn)
  if (lastError) return lastError
  return ''
}

export function passwordError(value, isEn = false) {
  const pass = String(value || '')
  if (pass.length < 8) return isEn ? 'Password must have at least 8 characters.' : 'Лозинката мора да има најмалку 8 карактери.'
  if (!/[A-Za-zА-Ша-ш]/.test(pass) || !/[0-9]/.test(pass)) {
    return isEn ? 'Password should include at least one letter and one number.' : 'Лозинката треба да содржи барем една буква и една бројка.'
  }
  return ''
}

export function positiveNumberInput(value, allowDecimal = true) {
  const raw = String(value ?? '').replace(',', '.')
  const pattern = allowDecimal ? /[^0-9.]/g : /[^0-9]/g
  const cleaned = raw.replace(pattern, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}
