'use client';

import { useEffect, useState } from 'react';

/**
 * Value that only updates after `delay` ms without changes.
 * @template T
 * @param {T} value
 * @param {number} [delay]
 * @returns {T}
 */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
