import { describe, expect, it } from 'vitest'

import {
  EMPTY_INPUT,
  pickOrgSlug,
  validateAll,
  validateStep,
} from '../src/lib/form'

const valid = {
  ...EMPTY_INPUT,
  supabaseToken: 'sbp_x',
  orgSlug: 'my-org',
  vercelToken: 'v',
  ownerEmail: 'me@example.com',
  ownerPassword: '123456',
}

describe('form validation', () => {
  it('accepts a complete input', () => {
    expect(validateAll(valid)).toEqual({})
  })

  it('validates only the current step', () => {
    expect(Object.keys(validateStep(0, EMPTY_INPUT))).toEqual([
      'supabaseToken',
      'orgSlug',
    ])
    expect(Object.keys(validateStep(2, EMPTY_INPUT))).toEqual([
      'ownerEmail',
      'ownerPassword',
    ])
  })

  it('enforces the config.toml minimum password length', () => {
    expect(
      validateStep(2, { ...valid, ownerPassword: '12345' }).ownerPassword,
    ).toBeTruthy()
  })

  it.each(['Family', '-x', 'x-', 'a_b', ''])(
    'rejects project name %j',
    (projectName) => {
      expect(
        validateStep(0, { ...valid, projectName }).projectName,
      ).toBeTruthy()
    },
  )

  it('accepts a blank or team_ Vercel team ID only', () => {
    expect(validateStep(1, { ...valid, vercelTeamId: 'team_abc123' })).toEqual(
      {},
    )
    expect(
      validateStep(1, { ...valid, vercelTeamId: 'my-team' }).vercelTeamId,
    ).toBeTruthy()
  })

  it('drops an org that is not in the loaded list', () => {
    expect(pickOrgSlug([{ slug: 'a' }, { slug: 'b' }], 'b')).toBe('b')
    expect(pickOrgSlug([{ slug: 'a' }], 'old')).toBe('a')
    expect(pickOrgSlug([], 'old')).toBe('')
  })
})
