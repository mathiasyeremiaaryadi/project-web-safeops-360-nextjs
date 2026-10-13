import { describe, expect, it } from 'vitest';
import { buildLoginUrl, getSafeRedirect } from '@/features/auth/lib/redirect';

describe('getSafeRedirect', () => {
  it.each([
    ['/change-password', '/change-password'],
    ['/tasks?site=1#top', '/tasks?site=1#top'],
    ['/', '/'],
  ])('accepts internal path %s', (input, expected) => {
    expect(getSafeRedirect(input)).toBe(expected);
  });

  it.each([
    '//evil.com',
    '///evil.com',
    'https://evil.com',
    'http://evil.com/path',
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '/\\evil.com',
    '\\\\evil.com',
    'evil.com',
    '/%0a/evil.com'.replace('%0a', '\n'),
    '',
    null,
    undefined,
    '/login',
    '/login?next=/x',
  ])('rejects %s', (input) => {
    expect(getSafeRedirect(input)).toBe('/');
  });

  it('uses the given fallback', () => {
    expect(getSafeRedirect('https://evil.com', '/home')).toBe('/home');
  });
});

describe('buildLoginUrl', () => {
  it('encodes the current path as next', () => {
    expect(buildLoginUrl('/change-password')).toBe('/login?next=%2Fchange-password');
  });

  it('omits next for the home page and unsafe paths', () => {
    expect(buildLoginUrl('/')).toBe('/login');
    expect(buildLoginUrl('//evil.com')).toBe('/login');
  });
});
