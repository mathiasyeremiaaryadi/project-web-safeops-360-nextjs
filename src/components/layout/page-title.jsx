'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const PageTitleContext = createContext({
  title: /** @type {string | null} */ (null),
  setTitle: /** @type {(title: string | null) => void} */ (() => {}),
});

/**
 * Holds the title of the current page so the shell header (mobile top bar, breadcrumb) can
 * show it — e.g. "Tambah User" under "Manajemen user".
 * @param {{ children: import('react').ReactNode }} props
 */
export function PageTitleProvider({ children }) {
  const [title, setTitle] = useState(/** @type {string | null} */ (null));
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>{children}</PageTitleContext.Provider>
  );
}

/** Title registered by the current page, if any. */
export function usePageTitle() {
  return useContext(PageTitleContext).title;
}

/**
 * Registers the page title while the page is mounted.
 * @param {string} title
 */
export function useRegisterPageTitle(title) {
  const { setTitle } = useContext(PageTitleContext);
  useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
}
