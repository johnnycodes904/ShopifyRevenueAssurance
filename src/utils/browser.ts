/**
 * Browser interaction helpers with fallbacks for sandboxed iframes and secure contexts.
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback if clipboard API throws (e.g., in sandboxed iframe or permission denied)
    }
  }

  // Fallback: create temporary textarea element for execCommand copy
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy text using fallback:', err);
    return false;
  }
}

export function downloadJsonFile(content: unknown, filename: string): void {
  const jsonString = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Defer object URL revocation to prevent browsers from prematurely canceling blob download streams
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
