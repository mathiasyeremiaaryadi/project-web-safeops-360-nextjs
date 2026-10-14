// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getForwardedHeaders } from '@/server/go/go-client';

describe('getForwardedHeaders', () => {
  it('keeps only the entry added by the nearest proxy', () => {
    const request = new Request('http://localhost/api/auth/login', {
      headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.7', 'user-agent': 'UA' },
    });
    expect(getForwardedHeaders(request)).toEqual({
      'X-Forwarded-For': '203.0.113.7',
      'User-Agent': 'UA',
    });
  });

  it('forwards a single value unchanged and omits missing headers', () => {
    const request = new Request('http://localhost/x', {
      headers: { 'x-forwarded-for': '203.0.113.7' },
    });
    expect(getForwardedHeaders(request)).toEqual({ 'X-Forwarded-For': '203.0.113.7' });
    expect(getForwardedHeaders(new Request('http://localhost/x'))).toEqual({});
  });
});
