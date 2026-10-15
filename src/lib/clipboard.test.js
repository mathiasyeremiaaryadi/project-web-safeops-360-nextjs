import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '@/lib/clipboard';

const setSecure = (secure, clipboard) => {
  Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true });
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
};

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
});

describe('copyText', () => {
  it('uses the Clipboard API on a secure page', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setSecure(true, { writeText });
    expect(await copyText('Tmp-Passw0rd')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('Tmp-Passw0rd');
  });

  it('falls back to execCommand on plain HTTP and leaves no textarea behind', async () => {
    setSecure(false, undefined);
    document.execCommand = vi.fn(() => true);
    expect(await copyText('Tmp-Passw0rd')).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('reports a failure when nothing can copy', async () => {
    setSecure(false, undefined);
    document.execCommand = vi.fn(() => false);
    expect(await copyText('x')).toBe(false);
  });
});
