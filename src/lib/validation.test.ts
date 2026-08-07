import { describe, expect, it } from 'vitest'

import {
  atMost,
  collect,
  differentPlayers,
  email,
  endNotBeforeStart,
  firstOf,
  httpUrl,
  intOrNull,
  isValid,
  isoDate,
  nonNegativeInteger,
  positiveInteger,
  required,
  slugify,
  textOrNull,
  validSlug,
  winnerIsInMatch,
  winnerMatchesScore,
} from './validation.ts'

describe('coercion', () => {
  it('turns an untouched optional field into null, not an empty string', () => {
    expect(textOrNull('')).toBeNull()
    expect(textOrNull('   ')).toBeNull()
    expect(textOrNull('  Suva Snooker Club  ')).toBe('Suva Snooker Club')
  })

  it('parses integers and reports junk as NaN', () => {
    expect(intOrNull('')).toBeNull()
    expect(intOrNull('  ')).toBeNull()
    expect(intOrNull('5')).toBe(5)
    expect(intOrNull('0')).toBe(0)
    expect(intOrNull('-3')).toBe(-3)
    expect(intOrNull('abc')).toBeNaN()
    expect(intOrNull('5.5')).toBeNaN()
  })
})

describe('numeric rules mirroring the schema CHECK constraints', () => {
  it('rejects a negative score, as `check (score1 >= 0)` does', () => {
    expect(nonNegativeInteger('-1', 'Score')).toMatch(/cannot be negative/)
    expect(nonNegativeInteger('0', 'Score')).toBeNull()
    expect(nonNegativeInteger('5', 'Score')).toBeNull()
  })

  it('allows an empty optional number', () => {
    expect(nonNegativeInteger('', 'Score')).toBeNull()
    expect(positiveInteger('', 'Age')).toBeNull()
  })

  it('rejects a zero age, as `check (age is null or age > 0)` does', () => {
    expect(positiveInteger('0', 'Age')).toMatch(/greater than zero/)
    expect(positiveInteger('-5', 'Age')).toMatch(/greater than zero/)
    expect(positiveInteger('31', 'Age')).toBeNull()
  })

  it('rejects non-integers', () => {
    expect(nonNegativeInteger('abc', 'Score')).toMatch(/whole number/)
    expect(positiveInteger('2.5', 'Age')).toMatch(/whole number/)
  })

  it('catches an implausibly large value the database would accept', () => {
    // 147 is the maximum break in snooker; SQL only knows it must be >= 0.
    expect(atMost('300', 147, 'Highest break')).toMatch(/cannot be more than 147/)
    expect(atMost('147', 147, 'Highest break')).toBeNull()
    expect(atMost('', 147, 'Highest break')).toBeNull()
  })
})

describe('date rules', () => {
  it('accepts an ISO date and rejects anything else', () => {
    expect(isoDate('2026-03-14', 'Start date')).toBeNull()
    expect(isoDate('', 'Start date')).toBeNull()
    expect(isoDate('14/03/2026', 'Start date')).toMatch(/must be a date/)
  })

  it('rejects a date that does not exist', () => {
    expect(isoDate('2026-02-31', 'Start date')).toMatch(/not a real date/)
  })

  it('rejects an end date before the start', () => {
    expect(endNotBeforeStart('2026-03-14', '2026-03-10')).toMatch(/cannot be before/)
  })

  it('allows an end date equal to or after the start, or absent', () => {
    expect(endNotBeforeStart('2026-03-14', '2026-03-14')).toBeNull()
    expect(endNotBeforeStart('2026-03-14', '2026-03-16')).toBeNull()
    expect(endNotBeforeStart('2026-03-14', '')).toBeNull()
  })
})

describe('contact rules', () => {
  it('accepts ordinary addresses', () => {
    expect(email('secretary@fijisnooker.org')).toBeNull()
    expect(email('a.b+tag@sub.domain.co.fj')).toBeNull()
    expect(email('')).toBeNull()
  })

  it('rejects obvious mistakes', () => {
    expect(email('not an email')).toMatch(/does not look like/)
    expect(email('missing@domain')).toMatch(/does not look like/)
    expect(email('@nolocal.com')).toMatch(/does not look like/)
  })

  it('requires http or https for URLs', () => {
    expect(httpUrl('https://example.com/photo.jpg')).toBeNull()
    expect(httpUrl('http://example.com')).toBeNull()
    expect(httpUrl('')).toBeNull()
    expect(httpUrl('example.com')).toMatch(/full URL/)
    expect(httpUrl('ftp://example.com')).toMatch(/http:\/\/ or https:\/\//)
    expect(httpUrl('javascript:alert(1)')).toMatch(/http:\/\/ or https:\/\//)
  })
})

describe('match consistency rules', () => {
  it('stops a player being entered against themselves', () => {
    expect(differentPlayers('a', 'a')).toMatch(/cannot play themselves/)
    expect(differentPlayers('a', 'b')).toBeNull()
    expect(differentPlayers('a', '')).toBeNull()
  })

  it('requires the winner to be one of the two players', () => {
    expect(winnerIsInMatch('c', 'a', 'b')).toMatch(/must be one of the two players/)
    expect(winnerIsInMatch('a', 'a', 'b')).toBeNull()
    expect(winnerIsInMatch('', 'a', 'b')).toBeNull()
  })

  it('catches a winner that contradicts the scores', () => {
    expect(winnerMatchesScore('b', 'a', 'b', '5', '3')).toMatch(/does not match the scores/)
    expect(winnerMatchesScore('a', 'a', 'b', '5', '3')).toBeNull()
    expect(winnerMatchesScore('b', 'a', 'b', '3', '5')).toBeNull()
  })

  it('rejects naming a winner when the scores are level', () => {
    expect(winnerMatchesScore('a', 'a', 'b', '4', '4')).toMatch(/scores are level/)
  })

  it('says nothing while the scores are still blank', () => {
    expect(winnerMatchesScore('a', 'a', 'b', '', '')).toBeNull()
  })
})

describe('slugify', () => {
  it('makes a URL-safe slug from a title', () => {
    expect(slugify('Suva Open 2026')).toBe('suva-open-2026')
  })

  it('collapses punctuation and repeated separators', () => {
    expect(slugify('AGM  Notice --- 2011!')).toBe('agm-notice-2011')
  })

  it('strips accents down to their base letters', () => {
    expect(slugify('Nadī Open')).toBe('nadi-open')
  })

  it('drops apostrophes rather than turning them into hyphens', () => {
    expect(slugify("Player's Championship")).toBe('players-championship')
  })

  it('trims leading and trailing separators', () => {
    expect(slugify('  -- Hello --  ')).toBe('hello')
  })

  it('caps the length without leaving a trailing hyphen', () => {
    const slug = slugify('word '.repeat(40))
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })

  it('returns an empty string when there is nothing usable', () => {
    expect(slugify('!!!')).toBe('')
    expect(slugify('')).toBe('')
  })
})

describe('validSlug', () => {
  it('accepts a well-formed slug', () => {
    expect(validSlug('suva-open-2026')).toBeNull()
    expect(validSlug('agm')).toBeNull()
  })

  it('rejects empty, uppercase, spaces and stray hyphens', () => {
    expect(validSlug('')).toMatch(/required/)
    expect(validSlug('Suva-Open')).toMatch(/lowercase/)
    expect(validSlug('suva open')).toMatch(/lowercase/)
    expect(validSlug('suva--open')).toMatch(/lowercase/)
    expect(validSlug('-suva')).toMatch(/lowercase/)
    expect(validSlug('suva-')).toMatch(/lowercase/)
  })

  it('accepts every slug slugify produces', () => {
    for (const title of ['Suva Open 2026', 'AGM Notice', 'Nadī Open', "Player's Cup"]) {
      expect(validSlug(slugify(title))).toBeNull()
    }
  })
})

describe('collect', () => {
  it('keeps only the fields with a message', () => {
    const errors = collect({
      name: required('', 'Name'),
      age: positiveInteger('31', 'Age'),
    })
    expect(Object.keys(errors)).toEqual(['name'])
    expect(isValid(errors)).toBe(false)
  })

  it('reports valid when every rule passed', () => {
    expect(isValid(collect({ name: required('Alice', 'Name') }))).toBe(true)
  })

  it('takes the first complaint per field', () => {
    expect(firstOf(null, 'second', 'third')).toBe('second')
    expect(firstOf(null, null)).toBeNull()
  })
})
