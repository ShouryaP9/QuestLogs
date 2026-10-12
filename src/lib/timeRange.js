// Helpers for the quest "Time" box.
// Values are stored as plain text like "7:30am-10:00am" (or just "7:30am" for a start time only).
// Older "7:30 AM - 10:00 AM" values are still understood.

const TIME_PATTERN = /^(\d{1,2}):(\d{2})\s*(am|pm)(?:\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm))?$/i

// Typed digits have no separators, so work out where the hour ends:
// "730" -> 7:30, "1030" -> 10:30, "10" -> hour 10 (still waiting on minutes).
function split(digits) {
  const twoDigitHour = digits[0] === '0' || (digits[0] === '1' && digits[1] !== undefined && '012'.includes(digits[1]) && (digits.length === 2 || digits.length === 4))
  const hourLength = twoDigitHour ? 2 : 1
  return { hour: digits.slice(0, hourLength), minute: digits.slice(hourLength) }
}

function isValidDigits(digits) {
  if (digits.length > 4) return false
  const { hour, minute } = split(digits)
  if (hour === '00') return false
  if (minute.length > 2) return false
  if (minute.length >= 1 && minute[0] > '5') return false
  return true
}

// Reads raw typed characters (digits plus A/P) into up to two times: start and end.
function parse(raw) {
  const times = [{ digits: '', period: '' }]
  for (const char of raw) {
    let current = times[times.length - 1]
    if (char >= '0' && char <= '9') {
      if (current.period) {
        if (times.length === 2) continue // both times are finished; ignore extra digits
        current = { digits: '', period: '' }
        times.push(current)
      }
      if (isValidDigits(current.digits + char)) current.digits += char
    } else if (!current.period && current.digits) {
      const { hour, minute } = split(current.digits)
      if (hour !== '0' && minute.length !== 1) current.period = char // wait for both minute digits, or none (meaning :00)
    }
  }
  return times.filter((time) => time.digits)
}

function renderTime({ digits, period }) {
  const { hour, minute } = split(digits)
  const showMinutes = minute || period
  return `${Number(hour)}${showMinutes ? `:${minute || '00'}` : ''}${period ? `${period.toLowerCase()}m` : ''}`
}

const toRaw = (value) => value.toUpperCase().replace(/[^0-9AP]/g, '')
const formatRaw = (raw) => parse(raw).map(renderTime).join('-')

// Call from the input's onChange. Typing "730AM1000AM" builds up "7:30 AM - 10:00 AM".
export function nextTimeValue(previous, typed) {
  let raw = toRaw(typed)
  let formatted = formatRaw(raw)
  // Backspacing over formatting characters (":", " ", "M") would just get re-added, so drop a real character instead.
  if (typed.length < previous.length && formatted === previous) {
    raw = raw.slice(0, -1)
    formatted = formatRaw(raw)
  }
  return formatted
}

const validPart = (hour, minute) => Number(hour) >= 1 && Number(hour) <= 12 && Number(minute) <= 59

// Reads a stored value into { start, end } parts, or null when it isn't a complete valid time.
function parseValue(value) {
  const match = TIME_PATTERN.exec((value || '').trim())
  if (!match || !validPart(match[1], match[2]) || (match[4] && !validPart(match[4], match[5]))) return null
  const part = (hour, minute, period) => ({ hour: String(Number(hour)), minute, period: period.toLowerCase() })
  return { start: part(match[1], match[2], match[3]), end: match[4] ? part(match[4], match[5], match[6]) : null }
}

export function timeError(value) {
  if (!value) return null
  return parseValue(value) ? null : 'Finish the time, like 7:30am-10:00am (or just a start time).'
}

// Canonical stored/typed form: "7:30am-10:00am". Anything unparseable is returned untouched.
export function normalizeTime(value) {
  const parsed = parseValue(value)
  if (!parsed) return value || ''
  const text = ({ hour, minute, period }) => `${hour}:${minute}${period}`
  return parsed.end ? `${text(parsed.start)}-${text(parsed.end)}` : text(parsed.start)
}

// Compact form for task entries: "7:30-10am" when both share am/pm, and ":00" is dropped ("10am").
export function formatTimeDisplay(value) {
  const parsed = parseValue(value)
  if (!parsed) return value || ''
  const text = ({ hour, minute, period }, showPeriod) => `${hour}${minute === '00' ? '' : `:${minute}`}${showPeriod ? period : ''}`
  const { start, end } = parsed
  if (!end) return text(start, true)
  return `${text(start, start.period !== end.period)}-${text(end, true)}`
}

// [start, end] in minutes after midnight, or null when there's no (valid) time.
export function timeSortKey(value) {
  const parsed = parseValue(value)
  if (!parsed) return null
  const minutes = ({ hour, minute, period }) => ((Number(hour) % 12) + (period === 'pm' ? 12 : 0)) * 60 + Number(minute)
  const start = minutes(parsed.start)
  return [start, parsed.end ? minutes(parsed.end) : start]
}

// Earlier tasks first; tasks without a time stay below, in the order they were added.
export function sortByTime(tasks) {
  return [...tasks].sort((a, b) => {
    const keyA = timeSortKey(a.time)
    const keyB = timeSortKey(b.time)
    if (keyA && keyB) return keyA[0] - keyB[0] || keyA[1] - keyB[1] || a.position - b.position
    if (keyA) return -1
    if (keyB) return 1
    return a.position - b.position
  })
}
