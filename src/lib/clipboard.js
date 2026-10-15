/**
 * Copies text to the clipboard. `navigator.clipboard` only exists on secure pages (HTTPS or
 * localhost); on plain HTTP (e.g. the app opened by IP address) a hidden textarea +
 * `execCommand('copy')` is used instead.
 * @param {string} text
 * @param {HTMLElement} [container] Where the hidden textarea goes — inside an open dialog, so its
 *   focus trap does not block the selection. Defaults to `document.body`.
 * @returns {Promise<boolean>} Whether the text was copied.
 */
export async function copyText(text, container = document.body) {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied: try the fallback.
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  container.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
