// Helpers for the quest "Time" box.
// Values are stored as plain text like "7:30am-10:00am" (or just "7:30am" for a start time only).
// Older "7:30 AM - 10:00 AM" values are still understood, and shorthand like "330-430pm" or "10-3" is
// filled in (see parseValue) so the second time lands after the first.

const TIME_PATTERN = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/i

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

// Reads raw typed characters (digits, a/p/m and "-") into a start time and an optional end time.
// Only the colon is added automatically: the "-" and any am/pm have to be typed.
function parse(raw) {
  const times = [{ digits: '', letter: '', m: false }]
  let dash = false
  for (const char of raw) {
    const current = times[times.length - 1]
    if (char >= '0' && char <= '9') {
      if (!current.letter && isValidDigits(current.digits + char)) current.digits += char
    } else if (char === 'A' || char === 'P') {
      if (current.letter || !current.digits) continue
      const { hour, minute } = split(current.digits)
      if (hour !== '0' && minute.length !== 1) current.letter = char // wait for both minute digits, or none
    } else if (char === 'M') {
      if (current.letter) current.m = true
    } else if (char === '-') {
      const { hour, minute } = split(current.digits)
      const finished = current.digits && hour !== '0' && minute.length !== 1 && (!current.letter || current.m)
      if (!dash && finished) { dash = true; times.push({ digits: '', letter: '', m: false }) }
    }
  }
  return { times, dash }
}

function renderTime({ digits, letter, m }) {
  if (!digits) return ''
  const { hour, minute } = split(digits)
  return `${Number(hour)}${minute ? `:${minute}` : ''}${letter.toLowerCase()}${m ? 'm' : ''}`
}

const toRaw = (value) => value.toUpperCase().replace(/[^0-9APM-]/g, '')
const formatRaw = (raw) => {
  return parse(raw).times.map(renderTime).join('-') // a trailing "-" stays visible while the end time is still empty
}

// Call from the input's onChange. Typing "730am-1000am" builds up "7:30am-10:00am".
export function nextTimeValue(previous, typed) {
  let raw = toRaw(typed)
  let formatted = formatRaw(raw)
  // Backspacing over the auto-added colon would just get re-added, so drop a real character instead.
  if (typed.length < previous.length && formatted === previous) {
    raw = raw.slice(0, -1)
    formatted = formatRaw(raw)
  }
  return formatted
}

const validPart = (hour, minute) => Number(hour) >= 1 && Number(hour) <= 12 && Number(minute) <= 59

// Reads a value into { start, end } parts, or null when it isn't a complete, unambiguous time.
// A missing am/pm is inferred so the second time comes after the first:
//   "330-430pm" -> 3:30pm-4:30pm   (second is later: same am/pm)
//   "10-3pm"    -> 10am-3pm        (second is earlier: the range crosses noon/midnight)
//   "10-3"      -> 10am-3pm        (neither given and the second is earlier)
// A lone time needs an am/pm, and so does "9-11" (no way to know which half of the day).
function parseValue(value) {
  const match = TIME_PATTERN.exec((value || '').trim())
  if (!match) return null
  const [, hour1, minute1 = '00', period1, hour2, minute2 = '00', period2] = match
  if (!validPart(hour1, minute1) || (hour2 && !validPart(hour2, minute2))) return null
  const part = (hour, minute, period) => ({ hour: String(Number(hour)), minute, period: period ? period.toLowerCase() : '' })
  const start = part(hour1, minute1, period1)
  if (!hour2) return start.period ? { start, end: null } : null
  const end = part(hour2, minute2, period2)
  const clock = (hour, minute) => (Number(hour) % 12) * 60 + Number(minute) // 12 counts as 0, so 12:30 comes before 1:00
  const startClock = clock(hour1, minute1)
  const endClock = clock(hour2, minute2)
  const later = endClock > startClock
  const opposite = (period) => (period === 'am' ? 'pm' : 'am')
  if (!start.period || !end.period) {
    if (endClock === startClock) return null
    if (!start.period && !end.period) {
      if (later) return null
      start.period = 'am'
      end.period = 'pm'
    } else if (!start.period) start.period = later ? end.period : opposite(end.period)
    else end.period = later ? start.period : opposite(start.period)
  }
  return { start, end }
}

export function timeError(value) {
  if (!value) return null
  return parseValue(value) ? null : 'Finish the time, like 330-430pm, 10-3 or 7:30am-10:00am (a lone start time needs am/pm).'
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
