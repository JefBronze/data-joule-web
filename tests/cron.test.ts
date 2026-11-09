import { describe, expect, it } from 'vitest'
import { isCronAuthorized } from '@/lib/cron'

describe('isCronAuthorized', () => {
  it('accepts the exact bearer secret', () => expect(isCronAuthorized('Bearer s3cret', 's3cret')).toBe(true))
  it('rejects a wrong or missing header', () => {
    expect(isCronAuthorized('Bearer nope00', 's3cret')).toBe(false)
    expect(isCronAuthorized('s3cret', 's3cret')).toBe(false)
    expect(isCronAuthorized(null, 's3cret')).toBe(false)
  })
  it('fails closed when CRON_SECRET is not set', () => {
    expect(isCronAuthorized('Bearer ', undefined)).toBe(false)
    expect(isCronAuthorized('Bearer ', '')).toBe(false)
  })
})
